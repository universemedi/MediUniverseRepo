package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.TemplateAudience;
import com.MediUnivers.service.domain.WebsiteTemplate;
import com.MediUnivers.service.dto.SaveWebsiteTemplateRequest;
import com.MediUnivers.service.dto.WebsiteTemplateDto;
import com.MediUnivers.service.repository.WebsiteTemplateRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

/** The template catalog platform super admins manage for both audiences (req #9). */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WebsiteTemplateService {

    private final WebsiteTemplateRepository repository;

    public List<WebsiteTemplateDto> listForAudience(String audience) {
        TemplateAudience parsed = parseAudience(audience);
        return repository.findByAudienceAndActiveTrueOrderBySortOrderAsc(parsed).stream().map(this::toDto).toList();
    }

    public List<WebsiteTemplateDto> listAllForAdmin() {
        return repository.findAllByOrderByAudienceAscSortOrderAsc().stream().map(this::toDto).toList();
    }

    @Transactional
    public WebsiteTemplateDto create(SaveWebsiteTemplateRequest request) {
        if (repository.findAll().stream().anyMatch(t -> t.getCode().equalsIgnoreCase(request.code()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A template with this code already exists.");
        }
        WebsiteTemplate t = new WebsiteTemplate();
        t.setCode(request.code());
        apply(t, request);
        return toDto(repository.save(t));
    }

    @Transactional
    public WebsiteTemplateDto update(Long id, SaveWebsiteTemplateRequest request) {
        WebsiteTemplate t = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Template not found: " + id));
        apply(t, request);
        return toDto(repository.save(t));
    }

    @Transactional
    public void deactivate(Long id) {
        WebsiteTemplate t = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Template not found: " + id));
        t.setActive(false);
        repository.save(t);
    }

    private void apply(WebsiteTemplate t, SaveWebsiteTemplateRequest request) {
        t.setName(request.name());
        t.setAudience(parseAudience(request.audience()));
        t.setDescription(request.description());
        t.setPreviewImageUrl(request.previewImageUrl());
        t.setActive(request.active());
        t.setSortOrder(request.sortOrder());
    }

    private TemplateAudience parseAudience(String audience) {
        try {
            return TemplateAudience.valueOf(audience.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown template audience: " + audience);
        }
    }

    private WebsiteTemplateDto toDto(WebsiteTemplate t) {
        return new WebsiteTemplateDto(t.getId(), t.getCode(), t.getName(), t.getAudience().name(),
                t.getDescription(), t.getPreviewImageUrl(), t.isActive(), t.getSortOrder());
    }
}
