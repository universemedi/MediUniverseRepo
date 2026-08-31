package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.PlatformBlogPost;
import com.MediUnivers.service.domain.PlatformContentCard;
import com.MediUnivers.service.domain.PlatformContentSection;
import com.MediUnivers.service.domain.PlatformTestimonial;
import com.MediUnivers.service.dto.PlatformBlogPostDto;
import com.MediUnivers.service.dto.PlatformContentCardDto;
import com.MediUnivers.service.dto.PlatformTestimonialDto;
import com.MediUnivers.service.dto.SavePlatformBlogPostRequest;
import com.MediUnivers.service.dto.SavePlatformContentCardRequest;
import com.MediUnivers.service.dto.SavePlatformTestimonialRequest;
import com.MediUnivers.service.repository.PlatformBlogPostRepository;
import com.MediUnivers.service.repository.PlatformContentCardRepository;
import com.MediUnivers.service.repository.PlatformTestimonialRepository;
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
 * Repeatable content on MediUnivers' own public website — testimonials, blog
 * posts, feature/solution/value cards and team members. Mirrors the shape of
 * the tenant-side {@link WebsiteContentService}, minus any organization scope
 * since this is platform-wide content, and (per an explicit ask) testimonials
 * here support real edit, not just create/delete.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PlatformWebsiteContentService {

    private final PlatformTestimonialRepository testimonialRepository;
    private final PlatformBlogPostRepository blogRepository;
    private final PlatformContentCardRepository contentCardRepository;

    // ---------------- Testimonials ----------------

    @Transactional(readOnly = true)
    public List<PlatformTestimonialDto> listTestimonials() {
        return testimonialRepository.findAllByOrderBySortOrderAsc().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<PlatformTestimonialDto> listPublishedTestimonials() {
        return testimonialRepository.findByPublishedTrueOrderBySortOrderAsc().stream().map(this::toDto).toList();
    }

    public PlatformTestimonialDto createTestimonial(SavePlatformTestimonialRequest request) {
        PlatformTestimonial t = new PlatformTestimonial();
        applyTestimonialFields(t, request);
        t = testimonialRepository.save(t);
        return toDto(t);
    }

    public PlatformTestimonialDto updateTestimonial(Long id, SavePlatformTestimonialRequest request) {
        PlatformTestimonial t = testimonialRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Testimonial not found: " + id));
        applyTestimonialFields(t, request);
        testimonialRepository.save(t);
        return toDto(t);
    }

    public void deleteTestimonial(Long id) {
        if (!testimonialRepository.existsById(id)) {
            throw new EntityNotFoundException("Testimonial not found: " + id);
        }
        testimonialRepository.deleteById(id);
    }

    private void applyTestimonialFields(PlatformTestimonial t, SavePlatformTestimonialRequest request) {
        t.setName(request.name());
        t.setRoleCompany(request.roleCompany());
        t.setMessage(request.message());
        t.setRating(request.rating() != null ? Math.min(Math.max(request.rating(), 1), 5) : 5);
        t.setPhotoUrl(request.photoUrl());
        t.setSortOrder(request.sortOrder() != null ? request.sortOrder() : 0);
        t.setPublished(request.published());
    }

    private PlatformTestimonialDto toDto(PlatformTestimonial t) {
        return new PlatformTestimonialDto(t.getId(), t.getName(), t.getRoleCompany(), t.getMessage(),
                t.getRating(), t.getPhotoUrl(), t.getSortOrder(), t.isPublished());
    }

    // ---------------- Blog ----------------

    @Transactional(readOnly = true)
    public List<PlatformBlogPostDto> listBlogPosts() {
        return blogRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<PlatformBlogPostDto> listPublishedBlogPosts() {
        return blogRepository.findByPublishedTrueOrderByPublishedAtDesc().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public PlatformBlogPostDto getPublishedBlogPost(String slug) {
        PlatformBlogPost post = blogRepository.findBySlugAndPublishedTrue(slug)
                .orElseThrow(() -> new EntityNotFoundException("Blog post not found: " + slug));
        return toDto(post);
    }

    public PlatformBlogPostDto createBlogPost(SavePlatformBlogPostRequest request) {
        PlatformBlogPost post = new PlatformBlogPost();
        post.setSlug(uniqueSlug(request.title()));
        applyBlogFields(post, request);
        post = blogRepository.save(post);
        return toDto(post);
    }

    public PlatformBlogPostDto updateBlogPost(Long id, SavePlatformBlogPostRequest request) {
        PlatformBlogPost post = blogRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Blog post not found: " + id));
        applyBlogFields(post, request);
        blogRepository.save(post);
        return toDto(post);
    }

    public void deleteBlogPost(Long id) {
        if (!blogRepository.existsById(id)) {
            throw new EntityNotFoundException("Blog post not found: " + id);
        }
        blogRepository.deleteById(id);
    }

    private void applyBlogFields(PlatformBlogPost post, SavePlatformBlogPostRequest request) {
        post.setTitle(request.title());
        post.setExcerpt(request.excerpt());
        post.setContent(request.content());
        post.setCoverImageUrl(request.coverImageUrl());
        post.setAuthor(request.author());
        if (request.published() && !post.isPublished()) post.setPublishedAt(Instant.now());
        post.setPublished(request.published());
    }

    private String uniqueSlug(String title) {
        String base = title.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        if (base.isBlank()) base = "post";
        String candidate = base;
        int suffix = 2;
        while (blogRepository.existsBySlug(candidate)) {
            candidate = base + "-" + suffix++;
        }
        return candidate;
    }

    private PlatformBlogPostDto toDto(PlatformBlogPost p) {
        return new PlatformBlogPostDto(p.getId(), p.getTitle(), p.getSlug(), p.getExcerpt(), p.getContent(),
                p.getCoverImageUrl(), p.getAuthor(), p.isPublished(), p.getCreatedAt(), p.getPublishedAt());
    }

    // ---------------- Content cards (features / solutions / values / team) ----------------

    @Transactional(readOnly = true)
    public List<PlatformContentCardDto> listContentCards(PlatformContentSection section) {
        return contentCardRepository.findBySectionOrderBySortOrderAsc(section).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<PlatformContentCardDto> listPublishedContentCards(PlatformContentSection section) {
        return contentCardRepository.findBySectionAndPublishedTrueOrderBySortOrderAsc(section).stream()
                .map(this::toDto).toList();
    }

    public PlatformContentCardDto createContentCard(SavePlatformContentCardRequest request) {
        PlatformContentCard card = new PlatformContentCard();
        card.setSection(parseSection(request.section()));
        applyContentCardFields(card, request);
        card = contentCardRepository.save(card);
        return toDto(card);
    }

    public PlatformContentCardDto updateContentCard(Long id, SavePlatformContentCardRequest request) {
        PlatformContentCard card = contentCardRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Content card not found: " + id));
        applyContentCardFields(card, request);
        contentCardRepository.save(card);
        return toDto(card);
    }

    public void deleteContentCard(Long id) {
        if (!contentCardRepository.existsById(id)) {
            throw new EntityNotFoundException("Content card not found: " + id);
        }
        contentCardRepository.deleteById(id);
    }

    private PlatformContentSection parseSection(String value) {
        try {
            return PlatformContentSection.valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown content section: " + value);
        }
    }

    private void applyContentCardFields(PlatformContentCard card, SavePlatformContentCardRequest request) {
        card.setIcon(request.icon());
        card.setTitle(request.title());
        card.setTag(request.tag());
        card.setDescription(request.description());
        card.setBulletsText(request.bulletsText());
        card.setSortOrder(request.sortOrder() != null ? request.sortOrder() : 0);
        card.setPublished(request.published());
    }

    private PlatformContentCardDto toDto(PlatformContentCard c) {
        return new PlatformContentCardDto(c.getId(), c.getSection().name(), c.getIcon(), c.getTitle(),
                c.getTag(), c.getDescription(), c.getBulletsText(), c.getSortOrder(), c.isPublished());
    }
}
