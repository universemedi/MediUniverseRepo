package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.*;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

/**
 * The Org Owner's side of the Website Builder — everything under "Manage:
 * Logo, Brand Colors, Organization Information, Home/About Page, Services,
 * Gallery, Testimonials, Blogs, Contact Information, Social Links, SEO
 * Settings" from the spec. Doctors/Departments aren't managed here — the
 * public site simply reads the org's existing Clinic data (see
 * PublicWebsiteService), so there's exactly one place staff data lives.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class WebsiteContentService {

    private final WebsiteConfigRepository configRepository;
    private final WebsiteServiceItemRepository serviceItemRepository;
    private final WebsiteGalleryImageRepository galleryRepository;
    private final WebsiteTestimonialRepository testimonialRepository;
    private final WebsiteBlogPostRepository blogRepository;
    private final WebsiteContactSubmissionRepository contactRepository;
    private final AccessService accessService;

    // ---------------- Config (branding, pages, contact, social, SEO) ----------------

    @Transactional(readOnly = true)
    public WebsiteConfigDto getConfig(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CMS);
        return toDto(requireConfig(organization));
    }

    public WebsiteConfigDto updateConfig(Organization organization, UpdateWebsiteConfigRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CMS);
        WebsiteConfig config = requireConfig(organization);
        if (request.templateCode() != null && !request.templateCode().isBlank()) config.setTemplateCode(request.templateCode());
        config.setPublished(request.published());
        config.setLogoUrl(request.logoUrl());
        if (request.primaryColor() != null && !request.primaryColor().isBlank()) config.setPrimaryColor(request.primaryColor());
        if (request.secondaryColor() != null && !request.secondaryColor().isBlank()) config.setSecondaryColor(request.secondaryColor());
        config.setTagline(request.tagline());
        config.setHeroHeading(request.heroHeading());
        config.setHeroSubheading(request.heroSubheading());
        config.setAboutContent(request.aboutContent());
        config.setContactEmail(request.contactEmail());
        config.setContactPhone(request.contactPhone());
        config.setContactAddress(request.contactAddress());
        config.setFacebookUrl(request.facebookUrl());
        config.setInstagramUrl(request.instagramUrl());
        config.setTwitterUrl(request.twitterUrl());
        config.setLinkedinUrl(request.linkedinUrl());
        config.setYoutubeUrl(request.youtubeUrl());
        config.setWhatsappNumber(request.whatsappNumber());
        config.setSeoTitle(request.seoTitle());
        config.setSeoDescription(request.seoDescription());
        config.setSeoKeywords(request.seoKeywords());
        config.setBookingEnabled(request.bookingEnabled());
        configRepository.save(config);
        return toDto(config);
    }

    private WebsiteConfig requireConfig(Organization organization) {
        return configRepository.findByOrganizationId(organization.getId())
                .orElseGet(() -> {
                    WebsiteConfig c = new WebsiteConfig();
                    c.setOrganization(organization);
                    return configRepository.save(c);
                });
    }

    WebsiteConfigDto toDto(WebsiteConfig c) {
        String siteUrl = c.getOrganization().getSlug() + ".mediunivers.com";
        return new WebsiteConfigDto(c.getTemplateCode(), c.isPublished(), c.getLogoUrl(), c.getPrimaryColor(), c.getSecondaryColor(),
                c.getTagline(), c.getHeroHeading(), c.getHeroSubheading(), c.getAboutContent(),
                c.getContactEmail(), c.getContactPhone(), c.getContactAddress(),
                c.getFacebookUrl(), c.getInstagramUrl(), c.getTwitterUrl(), c.getLinkedinUrl(), c.getYoutubeUrl(), c.getWhatsappNumber(),
                c.getSeoTitle(), c.getSeoDescription(), c.getSeoKeywords(), c.isBookingEnabled(), siteUrl);
    }

    // ---------------- Services ----------------

    @Transactional(readOnly = true)
    public List<WebsiteServiceItemDto> listServices(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CMS);
        return serviceItemRepository.findByOrganizationIdOrderBySortOrderAsc(organization.getId()).stream().map(this::toDto).toList();
    }

    public WebsiteServiceItemDto createService(Organization organization, SaveWebsiteServiceItemRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CMS);
        WebsiteServiceItem item = new WebsiteServiceItem();
        item.setOrganization(organization);
        item.setName(request.name());
        item.setDescription(request.description());
        item.setIconName(request.iconName());
        item.setSortOrder(request.sortOrder() != null ? request.sortOrder() : 0);
        item.setActive(request.active());
        item = serviceItemRepository.save(item);
        return toDto(item);
    }

    public void deleteService(Organization organization, Long id) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CMS);
        WebsiteServiceItem item = serviceItemRepository.findById(id)
                .filter(i -> i.getOrganization().getId().equals(organization.getId()))
                .orElseThrow(() -> new EntityNotFoundException("Service not found: " + id));
        serviceItemRepository.delete(item);
    }

    private WebsiteServiceItemDto toDto(WebsiteServiceItem i) {
        return new WebsiteServiceItemDto(i.getId(), i.getName(), i.getDescription(), i.getIconName(), i.getSortOrder(), i.isActive());
    }

    // ---------------- Gallery ----------------

    @Transactional(readOnly = true)
    public List<WebsiteGalleryImageDto> listGallery(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CMS);
        return galleryRepository.findByOrganizationIdOrderBySortOrderAsc(organization.getId()).stream().map(this::toDto).toList();
    }

    public WebsiteGalleryImageDto addGalleryImage(Organization organization, SaveGalleryImageRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CMS);
        WebsiteGalleryImage image = new WebsiteGalleryImage();
        image.setOrganization(organization);
        image.setImageUrl(request.imageUrl());
        image.setCaption(request.caption());
        image.setSortOrder(request.sortOrder() != null ? request.sortOrder() : 0);
        image = galleryRepository.save(image);
        return toDto(image);
    }

    public void deleteGalleryImage(Organization organization, Long id) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CMS);
        WebsiteGalleryImage image = galleryRepository.findById(id)
                .filter(i -> i.getOrganization().getId().equals(organization.getId()))
                .orElseThrow(() -> new EntityNotFoundException("Image not found: " + id));
        galleryRepository.delete(image);
    }

    private WebsiteGalleryImageDto toDto(WebsiteGalleryImage i) {
        return new WebsiteGalleryImageDto(i.getId(), i.getImageUrl(), i.getCaption(), i.getSortOrder());
    }

    // ---------------- Testimonials ----------------

    @Transactional(readOnly = true)
    public List<WebsiteTestimonialDto> listTestimonials(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CMS);
        return testimonialRepository.findByOrganizationIdOrderBySortOrderAsc(organization.getId()).stream().map(this::toDto).toList();
    }

    public WebsiteTestimonialDto createTestimonial(Organization organization, SaveTestimonialRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CMS);
        WebsiteTestimonial t = new WebsiteTestimonial();
        t.setOrganization(organization);
        t.setPatientName(request.patientName());
        t.setMessage(request.message());
        t.setRating(request.rating() != null ? Math.min(Math.max(request.rating(), 1), 5) : 5);
        t.setPhotoUrl(request.photoUrl());
        t.setSortOrder(request.sortOrder() != null ? request.sortOrder() : 0);
        t.setPublished(request.published());
        t = testimonialRepository.save(t);
        return toDto(t);
    }

    public void deleteTestimonial(Organization organization, Long id) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CMS);
        WebsiteTestimonial t = testimonialRepository.findById(id)
                .filter(x -> x.getOrganization().getId().equals(organization.getId()))
                .orElseThrow(() -> new EntityNotFoundException("Testimonial not found: " + id));
        testimonialRepository.delete(t);
    }

    private WebsiteTestimonialDto toDto(WebsiteTestimonial t) {
        return new WebsiteTestimonialDto(t.getId(), t.getPatientName(), t.getMessage(), t.getRating(), t.getPhotoUrl(), t.getSortOrder(), t.isPublished());
    }

    // ---------------- Blog ----------------

    @Transactional(readOnly = true)
    public List<WebsiteBlogPostDto> listBlogPosts(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CMS);
        return blogRepository.findByOrganizationIdOrderByCreatedAtDesc(organization.getId()).stream().map(this::toDto).toList();
    }

    public WebsiteBlogPostDto createBlogPost(Organization organization, SaveBlogPostRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CMS);
        WebsiteBlogPost post = new WebsiteBlogPost();
        post.setOrganization(organization);
        post.setTitle(request.title());
        post.setSlug(uniqueSlug(organization, request.title()));
        post.setExcerpt(request.excerpt());
        post.setContent(request.content());
        post.setCoverImageUrl(request.coverImageUrl());
        post.setAuthor(request.author());
        post.setPublished(request.published());
        if (request.published()) post.setPublishedAt(Instant.now());
        post = blogRepository.save(post);
        return toDto(post);
    }

    public WebsiteBlogPostDto updateBlogPost(Organization organization, Long id, SaveBlogPostRequest request) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CMS);
        WebsiteBlogPost post = blogRepository.findById(id)
                .filter(p -> p.getOrganization().getId().equals(organization.getId()))
                .orElseThrow(() -> new EntityNotFoundException("Blog post not found: " + id));
        post.setTitle(request.title());
        post.setExcerpt(request.excerpt());
        post.setContent(request.content());
        post.setCoverImageUrl(request.coverImageUrl());
        post.setAuthor(request.author());
        if (request.published() && !post.isPublished()) post.setPublishedAt(Instant.now());
        post.setPublished(request.published());
        blogRepository.save(post);
        return toDto(post);
    }

    public void deleteBlogPost(Organization organization, Long id) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CMS);
        WebsiteBlogPost post = blogRepository.findById(id)
                .filter(p -> p.getOrganization().getId().equals(organization.getId()))
                .orElseThrow(() -> new EntityNotFoundException("Blog post not found: " + id));
        blogRepository.delete(post);
    }

    private String uniqueSlug(Organization organization, String title) {
        String base = title.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        if (base.isBlank()) base = "post";
        String candidate = base;
        int suffix = 2;
        while (blogRepository.existsByOrganizationIdAndSlug(organization.getId(), candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private WebsiteBlogPostDto toDto(WebsiteBlogPost p) {
        return new WebsiteBlogPostDto(p.getId(), p.getTitle(), p.getSlug(), p.getExcerpt(), p.getContent(),
                p.getCoverImageUrl(), p.getAuthor(), p.isPublished(), p.getCreatedAt(), p.getPublishedAt());
    }

    // ---------------- Contact submissions ----------------

    @Transactional(readOnly = true)
    public List<WebsiteContactSubmissionDto> listContactSubmissions(Organization organization) {
        accessService.requireModuleEnabled(organization, ModuleGroup.CMS);
        return contactRepository.findByOrganizationIdOrderByCreatedAtDesc(organization.getId()).stream()
                .map(s -> new WebsiteContactSubmissionDto(s.getId(), s.getName(), s.getEmail(), s.getPhone(), s.getMessage(), s.getStatus(), s.getCreatedAt()))
                .toList();
    }

    public void markContactSubmissionRead(Organization organization, Long id) {
        WebsiteContactSubmission s = contactRepository.findById(id)
                .filter(x -> x.getOrganization().getId().equals(organization.getId()))
                .orElseThrow(() -> new EntityNotFoundException("Submission not found: " + id));
        s.setStatus("READ");
        contactRepository.save(s);
    }
}
