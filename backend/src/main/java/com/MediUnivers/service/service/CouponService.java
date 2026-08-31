package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.Coupon;
import com.MediUnivers.service.dto.CouponDto;
import com.MediUnivers.service.dto.CreateCouponRequest;
import com.MediUnivers.service.dto.UpdateCouponRequest;
import com.MediUnivers.service.repository.CouponRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CouponService {

    private final CouponRepository repository;

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
