package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.CreateRoleRequest;
import com.MediUnivers.service.dto.RoleAccessInput;
import com.MediUnivers.service.dto.RoleDto;
import com.MediUnivers.service.repository.RoleRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class RoleService {

    private final RoleRepository roleRepository;

    @Transactional(readOnly = true)
    public List<RoleDto> listForPortal(Portal portal) {
        return roleRepository.findByPortalAndOrganizationIsNull(portal).stream()
                .map(DtoMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<RoleDto> listForOrganization(Long organizationId) {
        List<Role> system = roleRepository.findByPortalAndOrganizationIsNull(Portal.TENANT);
        List<Role> custom = roleRepository.findByOrganizationId(organizationId);
        return java.util.stream.Stream.concat(system.stream(), custom.stream())
                .map(DtoMapper::toDto).toList();
    }

    public Role requireByCode(String code) {
        return roleRepository.findByCode(code)
                .orElseThrow(() -> new EntityNotFoundException("Unknown role: " + code));
    }

    /**
     * An org admin creates a role scoped to their own organization. Every
     * module group requested must actually be part of the organization's
     * business type (mirrors AccessService.orgTypeAllowsGroup) — an org can't
     * grant a role access to a module it structurally doesn't run, even if it
     * would otherwise have the plan for it.
     */
    public RoleDto createCustomRole(Organization organization, CreateRoleRequest request) {
        Role role = new Role();
        role.setName(request.name());
        role.setDescription(request.description());
        role.setPortal(Portal.TENANT);
        role.setSystem(false);
        role.setOrganization(organization);
        role.setCode("CUSTOM_" + organization.getId() + "_" + slug(request.name()) + "_" + shortId());

        for (String action : request.actions()) {
            try {
                role.getActions().add(ActionType.valueOf(action.toUpperCase(Locale.ROOT)));
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown action: " + action);
            }
        }

        for (RoleAccessInput input : request.access()) {
            ModuleGroup group;
            try {
                group = ModuleGroup.valueOf(input.moduleGroup().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown module group: " + input.moduleGroup());
            }
            if (group == ModuleGroup.PLATFORM) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Organizations cannot grant platform access.");
            }
            boolean orgRunsThisBusiness = group == ModuleGroup.ORG || group == ModuleGroup.PATIENT || group == ModuleGroup.BILLING
                    || organization.getOrgType().getModules().contains(group);
            if (!orgRunsThisBusiness) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "This organization's business type does not include " + group + ".");
            }

            RoleGroupAccess access = input.wildcard()
                    ? RoleGroupAccess.wildcard(group)
                    : RoleGroupAccess.paths(group, (input.paths() == null ? List.<String>of() : input.paths())
                        .toArray(new String[0]));
            if (!input.wildcard() && access.getPaths().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Provide at least one page path for " + group + " or mark it as wildcard.");
            }
            role.addGroupAccess(access);
        }

        return DtoMapper.toDto(roleRepository.save(role));
    }

    private static String slug(String name) {
        return name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 6);
    }
}
