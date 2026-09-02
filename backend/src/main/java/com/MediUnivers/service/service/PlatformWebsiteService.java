package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.PlatformWebsiteConfig;
import com.MediUnivers.service.domain.TemplateAudience;
import com.MediUnivers.service.dto.PlatformWebsiteConfigDto;
import com.MediUnivers.service.dto.UpdatePlatformWebsiteConfigRequest;
import com.MediUnivers.service.repository.PlatformWebsiteConfigRepository;
import com.MediUnivers.service.repository.WebsiteTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** MediUnivers' own site config — single row by convention, same requireX()-on-first-access idiom as everywhere else in this codebase (req #9, platform audience). */
@Service
@RequiredArgsConstructor
@Transactional
public class PlatformWebsiteService {

    private final PlatformWebsiteConfigRepository configRepository;
    private final WebsiteTemplateRepository templateRepository;

    /** Not read-only: requireConfig() auto-creates the singleton row on first access. */
    public PlatformWebsiteConfigDto getConfig() {
        return toDto(requireConfig());
    }

    public PlatformWebsiteConfigDto updateConfig(UpdatePlatformWebsiteConfigRequest request) {
        PlatformWebsiteConfig config = requireConfig();
        if (request.templateId() != null) {
            templateRepository.findById(request.templateId())
                    .filter(t -> t.getAudience() == TemplateAudience.PLATFORM)
                    .ifPresent(config::setTemplate);
        }
        config.setPublished(request.published());
        config.setLogoUrl(request.logoUrl());
        if (request.primaryColor() != null && !request.primaryColor().isBlank()) config.setPrimaryColor(request.primaryColor());
        if (request.secondaryColor() != null && !request.secondaryColor().isBlank()) config.setSecondaryColor(request.secondaryColor());
        config.setFontFamily(request.fontFamily());
        config.setBackgroundColor(request.backgroundColor());
        if (request.textSizeScale() != null && !request.textSizeScale().isBlank()) config.setTextSizeScale(request.textSizeScale());
        config.setTagline(request.tagline());
        config.setHeroHeading(request.heroHeading());
        config.setHeroSubheading(request.heroSubheading());
        config.setAboutContent(request.aboutContent());
        config.setMissionContent(request.missionContent());
        config.setContactEmail(request.contactEmail());
        config.setContactPhone(request.contactPhone());
        config.setContactAddress(request.contactAddress());
        config.setFacebookUrl(request.facebookUrl());
        config.setInstagramUrl(request.instagramUrl());
        config.setLinkedinUrl(request.linkedinUrl());
        config.setYoutubeUrl(request.youtubeUrl());
        config.setSeoTitle(request.seoTitle());
        config.setSeoDescription(request.seoDescription());
        config.setSeoKeywords(request.seoKeywords());
        config.setBannersJson(request.bannersJson());
        config.setNavItemsJson(request.navItemsJson());
        config.setFooterColumnsJson(request.footerColumnsJson());
        config.setStatsJson(request.statsJson());
        config.setPrivacyContent(request.privacyContent());
        config.setTermsContent(request.termsContent());
        config.setSecurityContent(request.securityContent());
        config.setPageBannersJson(request.pageBannersJson());
        config.setHomeCarouselJson(request.homeCarouselJson());
        config.setHeroVideoUrl(request.heroVideoUrl());
        configRepository.save(config);
        return toDto(config);
    }

    private PlatformWebsiteConfig requireConfig() {
        return configRepository.findAll().stream().findFirst()
                .orElseGet(() -> configRepository.save(new PlatformWebsiteConfig()));
    }

    private PlatformWebsiteConfigDto toDto(PlatformWebsiteConfig c) {
        return new PlatformWebsiteConfigDto(c.getTemplate() != null ? c.getTemplate().getId() : null,
                c.isPublished(), c.getLogoUrl(), c.getPrimaryColor(), c.getSecondaryColor(),
                c.getFontFamily(), c.getBackgroundColor(), c.getTextSizeScale(),
                c.getTagline(), c.getHeroHeading(), c.getHeroSubheading(), c.getAboutContent(), c.getMissionContent(),
                c.getContactEmail(), c.getContactPhone(), c.getContactAddress(),
                c.getFacebookUrl(), c.getInstagramUrl(), c.getLinkedinUrl(), c.getYoutubeUrl(),
                c.getSeoTitle(), c.getSeoDescription(), c.getSeoKeywords(),
                c.getBannersJson(), c.getNavItemsJson(), c.getFooterColumnsJson(), c.getStatsJson(),
                c.getPrivacyContent(), c.getTermsContent(), c.getSecurityContent(), c.getPageBannersJson(),
                c.getHomeCarouselJson(), c.getHeroVideoUrl());
    }
}
