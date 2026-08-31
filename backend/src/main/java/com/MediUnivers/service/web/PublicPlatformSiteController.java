package com.MediUnivers.service.web;

import com.MediUnivers.service.domain.PlatformContentSection;
import com.MediUnivers.service.dto.PlatformBlogPostDto;
import com.MediUnivers.service.dto.PlatformContentCardDto;
import com.MediUnivers.service.dto.PlatformTestimonialDto;
import com.MediUnivers.service.dto.PlatformWebsiteConfigDto;
import com.MediUnivers.service.service.PlatformWebsiteContentService;
import com.MediUnivers.service.service.PlatformWebsiteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

/**
 * Public (unauthenticated) read side of MediUnivers' own site content — the
 * counterpart to {@link PlatformWebsiteConfigController}/{@link PlatformWebsiteContentController},
 * which only the platform owner can write to. Nothing exposed here is
 * sensitive; it's exactly the content a visitor to the marketing site sees.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/public/platform-site")
public class PublicPlatformSiteController {

    private final PlatformWebsiteService platformWebsiteService;
    private final PlatformWebsiteContentService contentService;

    @GetMapping
    public PlatformWebsiteConfigDto getSite() {
        return platformWebsiteService.getConfig();
    }

    @GetMapping("/testimonials")
    public List<PlatformTestimonialDto> getTestimonials() {
        return contentService.listPublishedTestimonials();
    }

    @GetMapping("/blog")
    public List<PlatformBlogPostDto> getBlogPosts() {
        return contentService.listPublishedBlogPosts();
    }

    @GetMapping("/blog/{slug}")
    public PlatformBlogPostDto getBlogPost(@PathVariable String slug) {
        return contentService.getPublishedBlogPost(slug);
    }

    @GetMapping("/content-cards")
    public List<PlatformContentCardDto> getContentCards(@RequestParam String section) {
        try {
            return contentService.listPublishedContentCards(
                    PlatformContentSection.valueOf(section.toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown content section: " + section);
        }
    }
}
