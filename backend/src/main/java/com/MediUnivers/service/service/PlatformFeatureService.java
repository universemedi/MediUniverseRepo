package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.PlatformFeature;
import com.MediUnivers.service.dto.CreatePlatformFeatureRequest;
import com.MediUnivers.service.dto.PlatformFeatureDto;
import com.MediUnivers.service.dto.UpdatePlatformFeatureRequest;
import com.MediUnivers.service.repository.PlatformFeatureRepository;
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
public class PlatformFeatureService {

    private final PlatformFeatureRepository repository;

    public List<PlatformFeatureDto> listAll() {
        return repository.findAll().stream().map(PlatformFeatureService::toDto).toList();
    }

    @Transactional
    public PlatformFeatureDto create(CreatePlatformFeatureRequest request) {
        if (repository.findByCode(request.code()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A feature with this code already exists.");
        }
        PlatformFeature f = new PlatformFeature();
        f.setCode(request.code());
        f.setName(request.name());
        f.setModuleGroup(request.moduleGroup());
        f.setFeatureType(request.featureType());
        return toDto(repository.save(f));
    }

    @Transactional
    public PlatformFeatureDto update(Long id, UpdatePlatformFeatureRequest request) {
        PlatformFeature f = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Feature not found: " + id));
        f.setName(request.name());
        f.setModuleGroup(request.moduleGroup());
        f.setFeatureType(request.featureType());
        f.setActive(request.active());
        return toDto(repository.save(f));
    }

    @Transactional
    public void deactivate(Long id) {
        PlatformFeature f = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Feature not found: " + id));
        f.setActive(false);
        repository.save(f);
    }

    private static PlatformFeatureDto toDto(PlatformFeature f) {
        return new PlatformFeatureDto(f.getId(), f.getCode(), f.getName(), f.getModuleGroup(), f.getFeatureType(), f.isActive());
    }
}
