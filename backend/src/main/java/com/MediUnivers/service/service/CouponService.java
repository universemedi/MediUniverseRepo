package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.Coupon;
import com.MediUnivers.service.domain.NotificationPriority;
import com.MediUnivers.service.domain.PlatformNotificationEventType;
import com.MediUnivers.service.dto.CouponDto;
import com.MediUnivers.service.dto.CreateCouponRequest;
import com.MediUnivers.service.dto.ShareCouponRequest;
import com.MediUnivers.service.dto.UpdateCouponRequest;
import com.MediUnivers.service.repository.CouponRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CouponService {

    private final CouponRepository repository;
    private final PlatformNotificationService platformNotificationService;

    public List<CouponDto> listAll() {
        return repository.findAll().stream().map(CouponService::toDto).toList();
    }

    @Transactional
    public CouponDto create(CreateCouponRequest request) {
        if (repository.findByCode(request.code()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A coupon with this code already exists.");
        }
        Coupon c = new Coupon();
        c.setCode(request.code().toUpperCase());
        c.setDiscountPercent(request.discountPercent());
        c.setValidFrom(request.validFrom());
        c.setValidTo(request.validTo());
        if (request.planCodes() != null) c.getPlanCodes().addAll(request.planCodes());
        return toDto(repository.save(c));
    }

    @Transactional
    public CouponDto update(Long id, UpdateCouponRequest request) {
        Coupon c = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Coupon not found: " + id));
        c.setDiscountPercent(request.discountPercent());
        c.setValidFrom(request.validFrom());
        c.setValidTo(request.validTo());
        c.getPlanCodes().clear();
        if (request.planCodes() != null) c.getPlanCodes().addAll(request.planCodes());
        c.setActive(request.active());
        return toDto(repository.save(c));
    }

    @Transactional
    public void share(Long id, ShareCouponRequest request) {
        Coupon c = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Coupon not found: " + id));
        if (!c.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This coupon is inactive — activate it before sharing.");
        }
        Map<String, String> vars = new HashMap<>();
        vars.put("fullName", request.recipientName());
        vars.put("couponCode", c.getCode());
        vars.put("discountPercent", c.getDiscountPercent().stripTrailingZeros().toPlainString());
        vars.put("validTo", c.getValidTo() != null ? c.getValidTo().format(DateTimeFormatter.ISO_DATE) : "no end date");
        platformNotificationService.notify(PlatformNotificationEventType.COUPON_SHARED,
                NotificationRecipient.of(request.recipientName(), request.recipientEmail(), null),
                vars, NotificationPriority.NORMAL, "COUPON", c.getId());
    }

    @Transactional
    public void deactivate(Long id) {
        Coupon c = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Coupon not found: " + id));
        c.setActive(false);
        repository.save(c);
    }

    private static CouponDto toDto(Coupon c) {
        return new CouponDto(c.getId(), c.getCode(), c.getDiscountPercent(), c.getValidFrom(), c.getValidTo(),
                c.getPlanCodes(), c.getUsageCount(), c.isActive());
    }
}
