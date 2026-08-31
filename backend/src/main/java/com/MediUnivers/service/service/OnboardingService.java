package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.ModuleGroup;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.domain.UserStatus;
import com.MediUnivers.service.dto.OnboardingStepDto;
import com.MediUnivers.service.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * The organization's own go-live checklist — every step is computed live from
 * real data (branch count, invited users, catalogue size, ...), not stored:
 * there's nothing to create/edit here, just an honest read of how far this
 * org has actually gotten.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OnboardingService {

    private final BranchRepository branchRepository;
    private final AppUserRepository appUserRepository;
    private final DoctorRepository doctorRepository;
    private final MedicineRepository medicineRepository;
    private final LabTestRepository labTestRepository;
    private final WebsiteConfigRepository websiteConfigRepository;

    public List<OnboardingStepDto> checklist(Organization organization) {
        List<OnboardingStepDto> steps = new ArrayList<>();
        var modules = organization.getOrgType().getModules();

        steps.add(new OnboardingStepDto("branch", "Add another branch",
                "Your head office is set up — add more locations as you grow.",
                branchRepository.countByOrganizationId(organization.getId()) > 1));

        steps.add(new OnboardingStepDto("team", "Invite your team",
                "Bring in doctors, reception and other staff so they can sign in.",
                appUserRepository.countByOrganizationIdAndStatusIn(organization.getId(),
                        List.of(UserStatus.ACTIVE, UserStatus.INVITED)) > 1));

        if (modules.contains(ModuleGroup.CLINIC)) {
            steps.add(new OnboardingStepDto("doctors", "Add your doctors",
                    "Set up doctor profiles with specializations and consultation fees.",
                    doctorRepository.countByOrganizationId(organization.getId()) > 0));
        }
        if (modules.contains(ModuleGroup.PHARMACY)) {
            steps.add(new OnboardingStepDto("pharmacy", "Stock your pharmacy",
                    "Add medicines to your catalogue so dispensing and sales can start.",
                    medicineRepository.countByOrganizationId(organization.getId()) > 0));
        }
        if (modules.contains(ModuleGroup.LAB)) {
            steps.add(new OnboardingStepDto("lab", "Set up your lab catalogue",
                    "Add the tests your laboratory offers.",
                    labTestRepository.countByOrganizationId(organization.getId()) > 0));
        }
        if (modules.contains(ModuleGroup.CMS)) {
            steps.add(new OnboardingStepDto("website", "Publish your website",
                    "Finish your branding and publish your public site.",
                    websiteConfigRepository.findByOrganizationId(organization.getId())
                            .map(w -> w.isPublished()).orElse(false)));
        }

        return steps;
    }
}
