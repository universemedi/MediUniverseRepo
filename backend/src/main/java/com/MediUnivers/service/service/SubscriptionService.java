package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.SubscriptionStatus;
import com.MediUnivers.service.dto.SubscriptionDto;
import com.MediUnivers.service.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubscriptionService {

    private final SubscriptionRepository repository;

    public List<SubscriptionDto> listAll() {
        return repository.findAllByOrderByStartDateDesc().stream().map(DtoMapper::toDto).toList();
    }

    /** Active free trials — the "platform/trials" screen. */
    public List<SubscriptionDto> listActiveTrials() {
        return repository.findByStatusAndFreeTrialTrue(SubscriptionStatus.ACTIVE).stream()
                .map(DtoMapper::toDto).toList();
    }
}
