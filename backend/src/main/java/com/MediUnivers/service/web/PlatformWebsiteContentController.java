package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.PlatformContentSection;
import com.MediUnivers.service.dto.PlatformBlogPostDto;
import com.MediUnivers.service.dto.PlatformContentCardDto;
import com.MediUnivers.service.dto.PlatformTestimonialDto;
import com.MediUnivers.service.dto.SavePlatformBlogPostRequest;
import com.MediUnivers.service.dto.SavePlatformContentCardRequest;
import com.MediUnivers.service.dto.SavePlatformTestimonialRequest;
import com.MediUnivers.service.service.PlatformWebsiteContentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

/** Super Admin CRUD over MediUnivers' own repeatable site content (testimonials, blog, cards, team). */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/platform/website-content")
@PreAuthorize("hasAuthority('PORTAL_PLATFORM') and (hasAuthority('ROLE_SUPER_ADMIN') or hasAuthority('ROLE_PLATFORM_MARKETING'))")
public class PlatformWebsiteContentController {

    private final PlatformWebsiteContentService service;

    @GetMapping("/testimonials")
    public List<PlatformTestimonialDto> listTestimonials() {
        return service.listTestimonials();
    }

    @PostMapping("/testimonials")
    public PlatformTestimonialDto createTestimonial(@Valid @RequestBody SavePlatformTestimonialRequest request) {
        return service.createTestimonial(request);
    }

    @PutMapping("/testimonials/{id}")
    public PlatformTestimonialDto updateTestimonial(@PathVariable Long id, @Valid @RequestBody SavePlatformTestimonialRequest request) {
        return service.updateTestimonial(id, request);
    }

    @DeleteMapping("/testimonials/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTestimonial(@PathVariable Long id) {
        service.deleteTestimonial(id);
    }

    @GetMapping("/blog")
    public List<PlatformBlogPostDto> listBlogPosts() {
        return service.listBlogPosts();
    }

    @PostMapping("/blog")
    public PlatformBlogPostDto createBlogPost(@Valid @RequestBody SavePlatformBlogPostRequest request) {
        return service.createBlogPost(request);
    }

    @PutMapping("/blog/{id}")
    public PlatformBlogPostDto updateBlogPost(@PathVariable Long id, @Valid @RequestBody SavePlatformBlogPostRequest request) {
        return service.updateBlogPost(id, request);
    }

    @DeleteMapping("/blog/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBlogPost(@PathVariable Long id) {
        service.deleteBlogPost(id);
    }

    @GetMapping("/content-cards")
    public List<PlatformContentCardDto> listContentCards(@RequestParam String section) {
        return service.listContentCards(parseSection(section));
    }

    @PostMapping("/content-cards")
    public PlatformContentCardDto createContentCard(@Valid @RequestBody SavePlatformContentCardRequest request) {
        return service.createContentCard(request);
    }

    @PutMapping("/content-cards/{id}")
    public PlatformContentCardDto updateContentCard(@PathVariable Long id, @Valid @RequestBody SavePlatformContentCardRequest request) {
        return service.updateContentCard(id, request);
    }

    @DeleteMapping("/content-cards/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteContentCard(@PathVariable Long id) {
        service.deleteContentCard(id);
    }

    private PlatformContentSection parseSection(String value) {
        try {
            return PlatformContentSection.valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown content section: " + value);
        }
    }
}
