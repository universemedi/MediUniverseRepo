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

    @Transactional(readOnly = true)
    public PublicWebsiteDto getSite(String slug) {
        Organization org = requirePublishedOrg(slug);
        WebsiteConfig config = configRepository.findByOrganizationId(org.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "This site hasn't been set up yet."));

        List<PublicDoctorDto> doctors = doctorRepository.findByOrganizationId(org.getId()).stream()
                .filter(d -> d.isVisibleOnWebsite() && "ACTIVE".equals(d.getStatus()))
                .map(d -> new PublicDoctorDto(d.getId(), d.getFullName(), d.getQualification(), d.getExperienceYears(),
                        d.getSpecializations().stream().map(Specialization::getName).toList()))
                .toList();

        List<String> departments = departmentRepository.findByOrganizationId(org.getId()).stream()
                .filter(dept -> "ACTIVE".equals(dept.getStatus()))
                .map(Department::getName)
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
                blogs);
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
        contactRepository.save(submission);
    }

    public AppointmentDto bookAppointment(String slug, PublicBookAppointmentRequest request) {
        Organization org = requirePublishedOrg(slug);
        WebsiteConfig config = configRepository.findByOrganizationId(org.getId()).orElse(null);
        if (config == null || !config.isBookingEnabled()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Online booking isn't enabled for this organization.");
        }

        Patient patient = patientService.findOrCreateByPhone(org, request.patientFirstName(), request.patientLastName(),
                request.phone(), request.email());

        Long headBranchId = branchRepository.findByOrganizationId(org.getId()).stream()
                .filter(Branch::isHeadOffice).findFirst().map(Branch::getId).orElse(null);

        return appointmentService.book(org, new CreateAppointmentRequest(
                patient.getId(), request.doctorId(), request.appointmentDate(), null, request.reason(), headBranchId));
    }

    private Organization requirePublishedOrg(String slug) {
        Organization org = organizationRepository.findBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No site found at this address."));
        boolean published = configRepository.findByOrganizationId(org.getId()).map(WebsiteConfig::isPublished).orElse(false);
        if (!published) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "This site isn't published yet.");
        }
        return org;
    }
}
