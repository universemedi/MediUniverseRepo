package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.repository.LabResultRepository;
import com.MediUnivers.service.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Period;

/**
 * Result entry and verification. Technician enters -> Lab Incharge verifies
 * (spec §18) — once verified, a result is read-only unless explicitly
 * reopened by an authorized user (not implemented in this pass; verified
 * results are simply final here).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class LabResultService {

    private final LabResultRepository resultRepository;
    private final LabOrderService orderService;
    private final CurrentUserService currentUserService;
    private final AccessService accessService;

    public LabOrderDto enterResult(Organization organization, Long orderId, EnterResultRequest request) {
        LabOrder order = orderService.requireOwned(organization, orderId);
        accessService.requireModuleEnabled(organization, ModuleGroup.LAB);
        if (order.getStatus() == LabOrderStatus.SAMPLE_PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Collect the sample before entering results.");
        }

        LabOrderItem item = order.getItems().stream()
                .filter(i -> i.getId().equals(request.orderItemId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "This test is not part of the order."));

        LabResult result = resultRepository.findByOrderItemId(item.getId()).orElseGet(LabResult::new);
        if (result.getStatus() == ResultStatus.VERIFIED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This result is already verified and read-only.");
        }
        result.setOrderItem(item);
        result.setResultValue(request.resultValue());
        result.setUnit(request.unit());
        result.setRemarks(request.remarks());
        result.setFlag(computeFlag(item.getTest(), order.getPatient(), request.resultValue()));
        result.setStatus(ResultStatus.ENTERED);
        result.setEnteredBy(currentUserService.require());
        result.setEnteredAt(Instant.now());
        resultRepository.save(result);

        orderService.refreshStatusAfterResultsChanged(order);
        return orderService.toDto(order);
    }

    public LabOrderDto verifyResults(Organization organization, Long orderId, VerifyResultsRequest request) {
        LabOrder order = orderService.requireOwned(organization, orderId);
        accessService.requireModuleEnabled(organization, ModuleGroup.LAB);
        AppUser verifier = currentUserService.require();

        for (Long orderItemId : request.orderItemIds()) {
            LabResult result = resultRepository.findByOrderItemId(orderItemId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No result entered yet for one of the selected tests."));
            result.setStatus(ResultStatus.VERIFIED);
            result.setVerifiedBy(verifier);
            result.setVerifiedAt(Instant.now());
        }

        orderService.refreshStatusAfterResultsChanged(order);
        return orderService.toDto(order);
    }

    /** LOW/NORMAL/HIGH/CRITICAL against the first matching reference range for this patient's gender/age, or UNKNOWN if no numeric match. */
    private ResultFlag computeFlag(LabTest test, Patient patient, String rawValue) {
        BigDecimal value;
        try {
            value = new BigDecimal(rawValue.trim());
        } catch (NumberFormatException ex) {
            return ResultFlag.UNKNOWN; // qualitative result (e.g. "Positive"/"Negative") — no numeric flagging
        }
        Integer age = patient.getDateOfBirth() != null ? Period.between(patient.getDateOfBirth(), LocalDate.now()).getYears() : null;
        return test.getReferenceRanges().stream()
                .filter(r -> r.matches(patient.getGender(), age))
                .findFirst()
                .map(r -> flagAgainst(r, value))
                .orElse(ResultFlag.UNKNOWN);
    }

    private ResultFlag flagAgainst(LabReferenceRange r, BigDecimal value) {
        if (r.getCriticalLow() != null && value.compareTo(r.getCriticalLow()) < 0) return ResultFlag.CRITICAL;
        if (r.getCriticalHigh() != null && value.compareTo(r.getCriticalHigh()) > 0) return ResultFlag.CRITICAL;
        if (r.getMinValue() != null && value.compareTo(r.getMinValue()) < 0) return ResultFlag.LOW;
        if (r.getMaxValue() != null && value.compareTo(r.getMaxValue()) > 0) return ResultFlag.HIGH;
        return ResultFlag.NORMAL;
    }
}
