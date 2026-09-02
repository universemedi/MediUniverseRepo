package com.MediUnivers.service.dto;

public record WebsiteConfigDto(
        String templateCode, Long templateId, boolean published, String logoUrl, String primaryColor, String secondaryColor,
        String fontFamily, String backgroundColor, String textSizeScale,
        String tagline, String heroHeading, String heroSubheading, String aboutContent,
        String contactEmail, String contactPhone, String contactAddress,
        String facebookUrl, String instagramUrl, String twitterUrl, String linkedinUrl, String youtubeUrl, String whatsappNumber,
        String seoTitle, String seoDescription, String seoKeywords,
        String bannersJson, String navItemsJson, String footerColumnsJson,
        boolean bookingEnabled, String siteUrl, String heroVideoUrl, String slug
) {
}
