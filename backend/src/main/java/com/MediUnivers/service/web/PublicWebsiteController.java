package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.AppointmentDto;
import com.MediUnivers.service.dto.PublicBookAppointmentRequest;
import com.MediUnivers.service.dto.PublicWebsiteDto;
import com.MediUnivers.service.dto.SubmitContactFormRequest;
import com.MediUnivers.service.dto.WebsiteBlogPostDto;
import com.MediUnivers.service.service.PublicWebsiteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * The public-facing side of the Website Builder — everything a visitor to
 * {@code <slug>.mediunivers.com} needs, with no authentication. Reachable two ways: the
 * always-available path-based route (/site/{slug}, used when browsing from the platform's own
 * domain) and, once the frontend detects a request actually arrived on the org's own subdomain
 * or custom domain, the {@code by-subdomain} lookup below — same DTO, same rest of the API,
 * the org's slug from the resolved site is what every other call here still keys on.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/public/site")
public class PublicWebsiteController {

    private final PublicWebsiteService publicWebsiteService;

    @GetMapping("/{slug}")
    public PublicWebsiteDto getSite(@PathVariable String slug) {
        return publicWebsiteService.getSite(slug);
    }

    /** Resolves the same site by subdomain instead of slug — what the frontend calls once it
     * detects it's being loaded on an org's own domain (see useOrgDomain.ts) rather than the
     * platform's own domain, before it knows the org's slug for the rest of the site's calls. */
    @GetMapping("/by-subdomain/{subdomain}")
    public PublicWebsiteDto getSiteBySubdomain(@PathVariable String subdomain) {
        return publicWebsiteService.getSiteBySubdomain(subdomain);
    }

    @GetMapping("/{slug}/blog/{blogSlug}")
    public WebsiteBlogPostDto getBlogPost(@PathVariable String slug, @PathVariable String blogSlug) {
        return publicWebsiteService.getBlogPost(slug, blogSlug);
    }

    @PostMapping("/{slug}/contact")
    public void submitContactForm(@PathVariable String slug, @Valid @RequestBody SubmitContactFormRequest request) {
        publicWebsiteService.submitContactForm(slug, request);
    }

    @PostMapping("/{slug}/book-appointment")
    public AppointmentDto bookAppointment(@PathVariable String slug, @Valid @RequestBody PublicBookAppointmentRequest request) {
        return publicWebsiteService.bookAppointment(slug, request);
    }
}
