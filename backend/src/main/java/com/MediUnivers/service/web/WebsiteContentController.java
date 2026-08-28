package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.dto.*;
import com.MediUnivers.service.security.CurrentUserService;
import com.MediUnivers.service.service.WebsiteContentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('PORTAL_TENANT')")
public class WebsiteContentController {

    private final WebsiteContentService websiteContentService;
    private final CurrentUserService currentUserService;

    @GetMapping("/api/org/website/config")
    public WebsiteConfigDto getConfig() {
        return websiteContentService.getConfig(requireOrgUser().getOrganization());
    }

    @PutMapping("/api/org/website/config")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_MARKETING_MANAGER'))")
    public WebsiteConfigDto updateConfig(@Valid @RequestBody UpdateWebsiteConfigRequest request) {
        return websiteContentService.updateConfig(requireOrgUser().getOrganization(), request);
    }

    @GetMapping("/api/org/website/services")
    public List<WebsiteServiceItemDto> listServices() {
        return websiteContentService.listServices(requireOrgUser().getOrganization());
    }

    @PostMapping("/api/org/website/services")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_MARKETING_MANAGER'))")
    public WebsiteServiceItemDto createService(@Valid @RequestBody SaveWebsiteServiceItemRequest request) {
        return websiteContentService.createService(requireOrgUser().getOrganization(), request);
    }

    @DeleteMapping("/api/org/website/services/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_MARKETING_MANAGER'))")
    public void deleteService(@PathVariable Long id) {
        websiteContentService.deleteService(requireOrgUser().getOrganization(), id);
    }

    @GetMapping("/api/org/website/gallery")
    public List<WebsiteGalleryImageDto> listGallery() {
        return websiteContentService.listGallery(requireOrgUser().getOrganization());
    }

    @PostMapping("/api/org/website/gallery")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_MARKETING_MANAGER'))")
    public WebsiteGalleryImageDto addGalleryImage(@Valid @RequestBody SaveGalleryImageRequest request) {
        return websiteContentService.addGalleryImage(requireOrgUser().getOrganization(), request);
    }

    @DeleteMapping("/api/org/website/gallery/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_MARKETING_MANAGER'))")
    public void deleteGalleryImage(@PathVariable Long id) {
        websiteContentService.deleteGalleryImage(requireOrgUser().getOrganization(), id);
    }

    @GetMapping("/api/org/website/testimonials")
    public List<WebsiteTestimonialDto> listTestimonials() {
        return websiteContentService.listTestimonials(requireOrgUser().getOrganization());
    }

    @PostMapping("/api/org/website/testimonials")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_MARKETING_MANAGER'))")
    public WebsiteTestimonialDto createTestimonial(@Valid @RequestBody SaveTestimonialRequest request) {
        return websiteContentService.createTestimonial(requireOrgUser().getOrganization(), request);
    }

    @DeleteMapping("/api/org/website/testimonials/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_MARKETING_MANAGER'))")
    public void deleteTestimonial(@PathVariable Long id) {
        websiteContentService.deleteTestimonial(requireOrgUser().getOrganization(), id);
    }

    @GetMapping("/api/org/website/blogs")
    public List<WebsiteBlogPostDto> listBlogPosts() {
        return websiteContentService.listBlogPosts(requireOrgUser().getOrganization());
    }

    @PostMapping("/api/org/website/blogs")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_MARKETING_MANAGER'))")
    public WebsiteBlogPostDto createBlogPost(@Valid @RequestBody SaveBlogPostRequest request) {
        return websiteContentService.createBlogPost(requireOrgUser().getOrganization(), request);
    }

    @PutMapping("/api/org/website/blogs/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_MARKETING_MANAGER'))")
    public WebsiteBlogPostDto updateBlogPost(@PathVariable Long id, @Valid @RequestBody SaveBlogPostRequest request) {
        return websiteContentService.updateBlogPost(requireOrgUser().getOrganization(), id, request);
    }

    @DeleteMapping("/api/org/website/blogs/{id}")
    @PreAuthorize("hasAuthority('PORTAL_TENANT') and (hasAuthority('ROLE_ORG_OWNER') or hasAuthority('ROLE_ORG_ADMIN') or hasAuthority('ROLE_MARKETING_MANAGER'))")
    public void deleteBlogPost(@PathVariable Long id) {
        websiteContentService.deleteBlogPost(requireOrgUser().getOrganization(), id);
    }

    @GetMapping("/api/org/website/contact-submissions")
    public List<WebsiteContactSubmissionDto> listContactSubmissions() {
        return websiteContentService.listContactSubmissions(requireOrgUser().getOrganization());
    }

    @PostMapping("/api/org/website/contact-submissions/{id}/mark-read")
    public void markContactSubmissionRead(@PathVariable Long id) {
        websiteContentService.markContactSubmissionRead(requireOrgUser().getOrganization(), id);
    }

    private AppUser requireOrgUser() {
        AppUser me = currentUserService.require();
        if (me.getOrganization() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is not attached to an organization.");
        }
        return me;
    }
}
