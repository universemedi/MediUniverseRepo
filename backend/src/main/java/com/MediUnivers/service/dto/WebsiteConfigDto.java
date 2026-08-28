package com.MediUnivers.service.dto;

public record WebsiteConfigDto(
        String templateCode, boolean published, String logoUrl, String primaryColor, String secondaryColor,
        String tagline, String heroHeading, String heroSubheading, String aboutContent,
        String contactEmail, String contactPhone, String contactAddress,
        String facebookUrl, String instagramUrl, String twitterUrl, String linkedinUrl, String youtubeUrl, String whatsappNumber,
        String seoTitle, String seoDescription, String seoKeywords, boolean bookingEnabled, String siteUrl
) {
}
