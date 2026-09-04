package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.repository.*;
import com.MediUnivers.service.security.CurrentUserService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/** Lab orders: created by a doctor from a consultation, or booked directly by reception — either way, one flow from here. */
@Service
@RequiredArgsConstructor
@Transactional
public class LabOrderService {

    private final LabOrderRepository orderRepository;
    private final SampleCollectionRepository sampleCollectionRepository;
    private final LabResultRepository resultRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final ConsultationRepository consultationRepository;
    private final BranchRepository branchRepository;
    private final LabCatalogService catalogService;
    private final NumberSeriesService numberSeriesService;
    private final AccessService accessService;
    private final CurrentUserService currentUserService;
    private final BillingService billingService;

    private static final List<LabOrderStatus> TERMINAL_STATUSES =
            List.of(LabOrderStatus.VERIFIED, LabOrderStatus.COMPLETED, LabOrderStatus.CANCELLED, LabOrderStatus.REJECTED);

    @Transactional(readOnly = true)
    public List<LabOrderDto> list(Organization organization, List<LabOrderStatus> statuses) {
        accessService.requireModuleEnabled(organization, ModuleGroup.LAB);
        List<LabOrder> orders = (statuses == null || statuses.isEmpty())
                ? orderRepository.findByOrganizationIdOrderByCreatedAtDesc(organization.getId())
                : orderRepository.findByOrganizationIdAndStatusInOrderByCreatedAtDesc(organization.getId(), statuses);
        return orders.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<LabOrderDto> listForPatient(Organization organization, Long patientId) {
        accessService.requireModuleEnabled(organization, ModuleGroup.LAB);
        return orderRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .filter(o -> o.getOrganization().getId().equals(organization.getId()))
                .map(this::toDto)
                .toList();
    }

    public LabOrderDto createOrder(Organization organization, CreateLabOrderRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.LAB);
        Patient patient = patientRepository.findById(request.patientId())
                .filter(p -> p.getOrganization().getId().equals(organization.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown patient."));

        LabOrder order = new LabOrder();
        order.setOrganization(organization);
        order.setPatient(patient);
        order.setOrderNumber(numberSeriesService.next(organization, "LAB_ORDER", "LAB", com.MediUnivers.service.domain.ResetPolicy.YEARLY, 6));

        if (request.branchId() != null) {
            order.setBranch(branchRepository.findById(request.branchId())
                    .filter(b -> b.getOrganization().getId().equals(organization.getId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch does not belong to this organization.")));
        }
        if (request.doctorId() != null) {
            order.setDoctor(doctorRepository.findById(request.doctorId())
                    .filter(d -> d.getOrganization().getId().equals(organization.getId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown doctor.")));
        }
        if (request.consultationId() != null) {
            order.setConsultation(consultationRepository.findById(request.consultationId())
                    .filter(c -> c.getOrganization().getId().equals(organization.getId()))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown consultation.")));
        }

        for (Long testId : request.testIds()) {
            LabTest test = catalogService.requireOwned(organization, testId);
            LabOrderItem item = new LabOrderItem();
            item.setTest(test);
            item.setPrice(test.getPrice());
            item.setTaxPercent(test.getTaxPercent());
            order.addItem(item);
        }

        order = orderRepository.save(order);

        // Billing per spec: "Doctor Orders Test -> Billing -> Payment -> Lab Order Created."
        // We create the order and its invoice together (payment is collected separately by
        // reception through the Billing screens) rather than blocking order creation on
        // payment, which keeps sample collection able to proceed the same day.
        List<InvoiceLineItemInput> lines = order.getItems().stream()
                .map(item -> new InvoiceLineItemInput(item.getTest().getName(), "LAB_TEST", item.getTest().getId(),
                        1, item.getPrice(), java.math.BigDecimal.ZERO, item.getTaxPercent()))
                .toList();
        Invoice invoice = billingService.createInvoice(organization, order.getBranch(), patient, SourceModule.LAB, lines);
        order.setInvoice(invoice);

        return toDto(order);
    }

    public LabOrderDto collectSample(Organization organization, Long orderId, CollectSampleRequest request) {
        LabOrder order = requireOwned(organization, orderId);
        if (order.getStatus() != LabOrderStatus.SAMPLE_PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This order's sample has already been collected.");
        }
        SampleCollection collection = new SampleCollection();
        collection.setOrder(order);
        collection.setCollectionNumber(numberSeriesService.next(organization, "SAMPLE", "SMP", com.MediUnivers.service.domain.ResetPolicy.DAILY, 4));
        collection.setCollectedBy(currentUserService.require());
        collection.setSampleTypes(request.sampleTypes());
        collection.setRemarks(request.remarks());
        collection.setStatus(SampleStatus.COLLECTED);
        sampleCollectionRepository.save(collection);

        order.setStatus(LabOrderStatus.COLLECTED);
        return toDto(order);
    }

    /** Voids an order before its report is out — patient no-show, wrong test ordered, duplicate order. Once results
     * are verified the report has effectively already been delivered, so cancellation stops being available. */
    public LabOrderDto cancelOrder(Organization organization, Long orderId, CancelLabOrderRequest request) {
        LabOrder order = requireOwned(organization, orderId);
        if (TERMINAL_STATUSES.contains(order.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Can't cancel an order that's already " + order.getStatus().name().toLowerCase(java.util.Locale.ROOT) + ".");
        }
        if (order.getInvoice() != null) {
            billingService.cancelInvoice(organization, order.getInvoice().getId());
        }
        order.setStatus(LabOrderStatus.CANCELLED);
        return toDto(order);
    }

    /** The specimen itself is unusable (haemolyzed, insufficient quantity, wrong container, mislabeled) — the order
     * stays open and drops back to awaiting a fresh collection, reusing the same order/invoice rather than voiding it. */
    public LabOrderDto rejectSample(Organization organization, Long orderId, RejectSampleRequest request) {
        LabOrder order = requireOwned(organization, orderId);
        if (order.getStatus() != LabOrderStatus.COLLECTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only a collected-but-not-yet-processed sample can be rejected.");
        }
        SampleCollection latest = sampleCollectionRepository.findByOrderIdOrderByCollectedAtDesc(orderId).stream()
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "No sample collection found for this order."));
        latest.setStatus(SampleStatus.REJECTED);
        latest.setRemarks(request.reason());
        order.setStatus(LabOrderStatus.SAMPLE_PENDING);
        return toDto(order);
    }

    public LabOrderDto markProcessing(Organization organization, Long orderId) {
        LabOrder order = requireOwned(organization, orderId);
        if (order.getStatus() != LabOrderStatus.COLLECTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sample must be collected before processing can start.");
        }
        order.setStatus(LabOrderStatus.PROCESSING);
        return toDto(order);
    }

    /** Called by LabResultService once every item on the order has a result — advances the order automatically. */
    void refreshStatusAfterResultsChanged(LabOrder order) {
        boolean allEntered = order.getItems().stream().allMatch(i -> resultRepository.findByOrderItemId(i.getId()).isPresent());
        boolean allVerified = order.getItems().stream()
                .allMatch(i -> resultRepository.findByOrderItemId(i.getId())
                        .map(r -> r.getStatus() == ResultStatus.VERIFIED).orElse(false));
        if (allVerified) {
            order.setStatus(LabOrderStatus.VERIFIED);
        } else if (allEntered) {
            order.setStatus(LabOrderStatus.RESULT_READY);
        } else if (order.getStatus() == LabOrderStatus.COLLECTED) {
            order.setStatus(LabOrderStatus.PROCESSING);
        }
    }

    LabOrder requireOwned(Organization organization, Long orderId) {
        LabOrder o = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Lab order not found: " + orderId));
        if (!o.getOrganization().getId().equals(organization.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This order does not belong to your organization.");
        }
        return o;
    }

    LabOrderDto toDto(LabOrder o) {
        List<LabOrderItemDto> items = o.getItems().stream().map(this::toItemDto).toList();
        List<SampleCollectionDto> samples = sampleCollectionRepository.findByOrderIdOrderByCollectedAtDesc(o.getId()).stream()
                .map(s -> new SampleCollectionDto(s.getId(), s.getCollectionNumber(), s.getSampleTypes(),
                        s.getStatus().name(), s.getRemarks(), s.getCollectedAt(),
                        s.getCollectedBy() != null ? s.getCollectedBy().getFullName() : null))
                .toList();
        Patient p = o.getPatient();
        return new LabOrderDto(o.getId(), o.getOrderNumber(), o.getStatus().name(),
                new PatientSummaryDto(p.getId(), p.getPatientNumber(), p.fullName(), p.getPhone()),
                o.getDoctor() != null ? o.getDoctor().getFullName() : null,
                items, samples, o.getCreatedAt(), o.getInvoice() != null ? o.getInvoice().getId() : null);
    }

    private LabOrderItemDto toItemDto(LabOrderItem item) {
        LabResultDto resultDto = resultRepository.findByOrderItemId(item.getId()).map(r -> new LabResultDto(
                r.getId(), r.getResultValue(), r.getUnit(), r.getRemarks(), r.getFlag().name(), r.getStatus().name(),
                r.getEnteredBy().getFullName(), r.getEnteredAt(),
                r.getVerifiedBy() != null ? r.getVerifiedBy().getFullName() : null, r.getVerifiedAt()
        )).orElse(null);
        return new LabOrderItemDto(item.getId(), item.getTest().getId(), item.getTest().getName(), item.getTest().getSampleType(), item.getPrice(), item.getTaxPercent(), resultDto);
    }
}
