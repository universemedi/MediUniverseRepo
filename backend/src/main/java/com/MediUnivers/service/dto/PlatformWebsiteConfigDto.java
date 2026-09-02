package com.MediUnivers.service.dto;

public record PlatformWebsiteConfigDto(
        Long templateId, boolean published, String logoUrl, String primaryColor, String secondaryColor,
        String fontFamily, String backgroundColor, String textSizeScale,
        String tagline, String heroHeading, String heroSubheading, String aboutContent, String missionContent,
        String contactEmail, String contactPhone, String contactAddress,
        String facebookUrl, String instagramUrl, String linkedinUrl, String youtubeUrl,
        String seoTitle, String seoDescription, String seoKeywords,
        String bannersJson, String navItemsJson, String footerColumnsJson, String statsJson,
        String privacyContent, String termsContent, String securityContent, String pageBannersJson,
        String homeCarouselJson, String heroVideoUrl
) {
}
