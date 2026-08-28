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
 * {@code <slug>.mediunivers.com} needs, with no authentication. In this
 * environment (no real subdomain routing available) the frontend serves this
 * at a path-based route instead; the API contract is the same either way.
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
