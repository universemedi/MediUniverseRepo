package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.PlatformModule;
import com.MediUnivers.service.dto.CreatePlatformModuleRequest;
import com.MediUnivers.service.dto.PlatformModuleDto;
import com.MediUnivers.service.dto.UpdatePlatformModuleRequest;
import com.MediUnivers.service.repository.PlatformModuleRepository;
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
public class PlatformModuleService {

    private final PlatformModuleRepository repository;

    public List<PlatformModuleDto> listAll() {
        return repository.findAll().stream().map(PlatformModuleService::toDto).toList();
    }

    @Transactional
    public PlatformModuleDto create(CreatePlatformModuleRequest request) {
        if (repository.findByCode(request.code()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A module with this code already exists.");
        }
        PlatformModule m = new PlatformModule();
        m.setCode(request.code());
        m.setName(request.name());
        m.setCategory(request.category());
        return toDto(repository.save(m));
    }

    @Transactional
    public PlatformModuleDto update(Long id, UpdatePlatformModuleRequest request) {
        PlatformModule m = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Module not found: " + id));
        m.setName(request.name());
        m.setCategory(request.category());
        m.setActive(request.active());
        return toDto(repository.save(m));
    }

    @Transactional
    public void deactivate(Long id) {
        PlatformModule m = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Module not found: " + id));
        m.setActive(false);
        repository.save(m);
    }

    private static PlatformModuleDto toDto(PlatformModule m) {
        return new PlatformModuleDto(m.getId(), m.getCode(), m.getName(), m.getCategory(), m.isActive());
    }
}
