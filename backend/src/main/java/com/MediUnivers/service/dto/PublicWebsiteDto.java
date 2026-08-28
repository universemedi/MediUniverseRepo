package com.MediUnivers.service.dto;

import java.util.List;

public record PublicWebsiteDto(
        String organizationName, String slug, WebsiteConfigDto config,
        List<WebsiteServiceItemDto> services, List<PublicDoctorDto> doctors, List<String> departments,
        List<WebsiteGalleryImageDto> gallery, List<WebsiteTestimonialDto> testimonials, List<PublicBlogSummaryDto> blogs
) {
}
