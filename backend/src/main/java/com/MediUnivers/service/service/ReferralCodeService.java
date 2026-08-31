package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.domain.ReferralCode;
import com.MediUnivers.service.dto.CreateReferralCodeRequest;
import com.MediUnivers.service.dto.ReferralCodeDto;
import com.MediUnivers.service.dto.UpdateReferralCodeRequest;
import com.MediUnivers.service.repository.OrganizationRepository;
import com.MediUnivers.service.repository.ReferralCodeRepository;
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
public class ReferralCodeService {

    private final ReferralCodeRepository repository;
    private final OrganizationRepository organizationRepository;

    public List<ReferralCodeDto> listAll() {
        return repository.findAll().stream().map(ReferralCodeService::toDto).toList();
    }

    @Transactional
    public ReferralCodeDto create(CreateReferralCodeRequest request) {
        if (repository.findByCode(request.code()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A referral code with this code already exists.");
        }
        Organization org = organizationRepository.findById(request.organizationId())
                .orElseThrow(() -> new EntityNotFoundException("Organization not found: " + request.organizationId()));
        ReferralCode r = new ReferralCode();
        r.setCode(request.code().toUpperCase());
        r.setOrganization(org);
        r.setRewardAmount(request.rewardAmount());
        return toDto(repository.save(r));
    }

    @Transactional
    public ReferralCodeDto update(Long id, UpdateReferralCodeRequest request) {
        ReferralCode r = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Referral code not found: " + id));
        r.setRewardAmount(request.rewardAmount());
        r.setEnabled(request.enabled());
        return toDto(repository.save(r));
    }

    @Transactional
    public void deactivate(Long id) {
        ReferralCode r = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Referral code not found: " + id));
        r.setEnabled(false);
        repository.save(r);
    }

    private static ReferralCodeDto toDto(ReferralCode r) {
        return new ReferralCodeDto(r.getId(), r.getCode(), r.getOrganization().getId(), r.getOrganization().getName(),
                r.getRewardAmount(), r.getSignupCount(), r.isEnabled());
    }
}
