package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

/**
 * The public side of the Website Builder — everything an anonymous visitor
 * to {@code <slug>.mediunivers.com} can see or do: browse the site, read a
 * blog post, submit the contact form, book an appointment. No
 * authentication anywhere in this class on purpose.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PublicWebsiteService {

    private final OrganizationRepository organizationRepository;
    private final WebsiteConfigRepository configRepository;
    private final WebsiteServiceItemRepository serviceItemRepository;
    private final WebsiteGalleryImageRepository galleryRepository;
    private final WebsiteTestimonialRepository testimonialRepository;
    private final WebsiteBlogPostRepository blogRepository;
    private final WebsiteContactSubmissionRepository contactRepository;
    private final DoctorRepository doctorRepository;
    private final DepartmentRepository departmentRepository;
    private final ClinicPatientService patientService;
    private final ClinicAppointmentService appointmentService;
    private final BranchRepository branchRepository;
    private final WebsiteContentService websiteContentService;
    private final NotificationService notificationService;
    private final AccessService accessService;

    @Transactional(readOnly = true)
    public PublicWebsiteDto getSite(String slug) {
        return buildSiteDto(requirePublishedOrg(slug));
    }

    /** Same site payload, resolved by the org's short subdomain instead of its full slug —
     * what a custom-domain visit (or a "sunrise.mediunivers.io"-style dev/test hostname) resolves
     * against, since a subdomain is what actually goes in front of the platform's own domain. */
    @Transactional(readOnly = true)
    public PublicWebsiteDto getSiteBySubdomain(String subdomain) {
        return buildSiteDto(requirePublishedOrgBySubdomain(subdomain));
    }

    private PublicWebsiteDto buildSiteDto(Organization org) {
        WebsiteConfig config = configRepository.findByOrganizationId(org.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "This site hasn't been set up yet."));

        List<PublicDoctorDto> doctors = doctorRepository.findByOrganizationId(org.getId()).stream()
                .filter(d -> d.isVisibleOnWebsite() && "ACTIVE".equals(d.getStatus()))
                .map(d -> new PublicDoctorDto(d.getId(), d.getFullName(), d.getQualification(), d.getPhotoUrl(), d.getExperienceYears(),
                        d.getSpecializations().stream().map(Specialization::getName).toList(),
                        d.getBranch() != null ? d.getBranch().getId() : null))
                .toList();

        List<String> departments = departmentRepository.findByOrganizationId(org.getId()).stream()
                .filter(dept -> "ACTIVE".equals(dept.getStatus()))
                .map(Department::getName)
                .toList();

        List<PublicBranchDto> branches = branchRepository.findByOrganizationId(org.getId()).stream()
                .filter(b -> b.getStatus() == BranchStatus.ACTIVE)
                .map(b -> new PublicBranchDto(b.getId(), b.getName(), b.isHeadOffice(), b.getCity(), b.getAddressLine1()))
                .toList();

        List<PublicBlogSummaryDto> blogs = blogRepository.findByOrganizationIdAndPublishedTrueOrderByPublishedAtDesc(org.getId()).stream()
                .map(b -> new PublicBlogSummaryDto(b.getId(), b.getTitle(), b.getSlug(), b.getExcerpt(), b.getCoverImageUrl(), b.getPublishedAt()))
                .toList();

        return new PublicWebsiteDto(org.getName(), org.getSlug(), websiteContentService.toDto(config),
                serviceItemRepository.findByOrganizationIdAndActiveTrueOrderBySortOrderAsc(org.getId()).stream()
                        .map(i -> new WebsiteServiceItemDto(i.getId(), i.getName(), i.getDescription(), i.getIconName(), i.getSortOrder(), i.isActive()))
                        .collect(Collectors.toList()),
                doctors, departments,
                galleryRepository.findByOrganizationIdOrderBySortOrderAsc(org.getId()).stream()
                        .map(i -> new WebsiteGalleryImageDto(i.getId(), i.getImageUrl(), i.getCaption(), i.getSortOrder()))
                        .collect(Collectors.toList()),
                testimonialRepository.findByOrganizationIdAndPublishedTrueOrderBySortOrderAsc(org.getId()).stream()
                        .map(t -> new WebsiteTestimonialDto(t.getId(), t.getPatientName(), t.getMessage(), t.getRating(), t.getPhotoUrl(), t.getSortOrder(), t.isPublished()))
                        .collect(Collectors.toList()),
                blogs, branches);
    }

    @Transactional(readOnly = true)
    public WebsiteBlogPostDto getBlogPost(String slug, String blogSlug) {
        Organization org = requirePublishedOrg(slug);
        var post = blogRepository.findByOrganizationIdAndSlug(org.getId(), blogSlug)
                .filter(WebsiteBlogPost::isPublished)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "This post wasn't found."));
        return new WebsiteBlogPostDto(post.getId(), post.getTitle(), post.getSlug(), post.getExcerpt(), post.getContent(),
                post.getCoverImageUrl(), post.getAuthor(), post.isPublished(), post.getCreatedAt(), post.getPublishedAt());
    }

    public void submitContactForm(String slug, SubmitContactFormRequest request) {
        Organization org = requirePublishedOrg(slug);
        WebsiteContactSubmission submission = new WebsiteContactSubmission();
        submission.setOrganization(org);
        submission.setName(request.name());
        submission.setEmail(request.email());
        submission.setPhone(request.phone());
        submission.setMessage(request.message());
        submission = contactRepository.save(submission);

        // Notify the organization itself (not the visitor) that a new enquiry has landed.
        java.util.Map<String, String> vars = new java.util.HashMap<>();
        vars.put("visitorName", request.name());
        vars.put("visitorEmail", request.email() != null ? request.email() : "");
        vars.put("visitorPhone", request.phone() != null ? request.phone() : "");
        vars.put("message", request.message() != null ? request.message() : "");
        notificationService.notify(org, NotificationEventType.WEBSITE_CONTACT_RECEIVED,
                NotificationRecipient.of(org.getName(), org.getEmail(), org.getPhone()),
                vars, NotificationPriority.NORMAL, "WEBSITE_CONTACT", submission.getId(), null);
    }

    /** Booking is mandatory on every organization website (req #11) — no config gate here. */
    public AppointmentDto bookAppointment(String slug, PublicBookAppointmentRequest request) {
        Organization org = requirePublishedOrg(slug);

        Patient patient = patientService.findOrCreateByPhone(org, request.patientFirstName(), request.patientLastName(),
                request.phone(), request.email());

        List<Branch> orgBranches = branchRepository.findByOrganizationId(org.getId());
        Long branchId = request.branchId() != null
                ? orgBranches.stream().filter(b -> b.getId().equals(request.branchId())).findFirst()
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "That branch isn't part of this organization."))
                        .getId()
                : orgBranches.stream().filter(Branch::isHeadOffice).findFirst().map(Branch::getId).orElse(null);

        return appointmentService.book(org, new CreateAppointmentRequest(
                patient.getId(), request.doctorId(), request.appointmentDate(), null, request.reason(), branchId));
    }

    private Organization requirePublishedOrg(String slug) {
        return requirePublished(organizationRepository.findBySlug(slug));
    }

    /** An org that never set a custom subdomain is still reachable at its slug — the same
     * fallback {@link WebsiteContentService#toDto} uses to build the "Live at" URL shown to the
     * org, so what they're told their site's address is always matches what actually resolves. */
    private Organization requirePublishedOrgBySubdomain(String subdomain) {
        java.util.Optional<Organization> maybeOrg = organizationRepository.findBySubdomain(subdomain)
                .or(() -> organizationRepository.findBySlug(subdomain));
        return requirePublished(maybeOrg);
    }

    private Organization requirePublished(java.util.Optional<Organization> maybeOrg) {
        Organization org = maybeOrg
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No site found at this address."));
        boolean published = configRepository.findByOrganizationId(org.getId()).map(WebsiteConfig::isPublished).orElse(false);
        if (!published) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "This site isn't published yet.");
        }
        // The Website/CMS module has to actually be part of what this org currently pays for —
        // a lapsed subscription or a plan downgrade that drops CMS takes the public site down
        // too, not just the admin editor behind it. Business detail (which reason) stays out of
        // the public error; the org sees the real reason in their own admin console instead.
        try {
            accessService.requireModuleEnabled(org, ModuleGroup.CMS);
        } catch (ResponseStatusException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "This site isn't available right now.");
        }
        return org;
    }
}
