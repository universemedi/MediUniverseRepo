package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.OrgType;
import com.MediUnivers.service.dto.OrgTypeDto;
import com.MediUnivers.service.repository.OrgTypeRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrgTypeService {

    private final OrgTypeRepository repository;

    public List<OrgTypeDto> listAll() {
        return repository.findAll().stream().map(DtoMapper::toDto).toList();
    }

    public OrgType requireByCode(String code) {
        return repository.findByCode(code)
                .orElseThrow(() -> new EntityNotFoundException("Unknown organization type: " + code));
    }
}
