package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.Plan;
import com.MediUnivers.service.dto.PlanDto;
import com.MediUnivers.service.repository.PlanRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlanService {

    private final PlanRepository repository;

    public List<PlanDto> listAll() {
        return repository.findAll().stream()
                .sorted((a, b) -> Integer.compare(a.getSortOrder(), b.getSortOrder()))
                .map(DtoMapper::toDto).toList();
    }

    public Plan requireByCode(String code) {
        return repository.findByCode(code)
                .orElseThrow(() -> new EntityNotFoundException("Unknown plan: " + code));
    }
}
