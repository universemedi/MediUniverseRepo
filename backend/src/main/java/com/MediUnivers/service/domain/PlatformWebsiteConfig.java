package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * MediUnivers' own site config — same shape as {@link WebsiteConfig} minus
 * the organization link, single-row-by-convention (enforced in
 * PlatformWebsiteService, same requireConfig()-style idiom used everywhere
 * else in this codebase for a "one row, create on first access" table).
 */
@Entity
@Table(name = "platform_website_config")
@Getter
@Setter
@NoArgsConstructor
public class PlatformWebsiteConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private WebsiteTemplate template;

    @Column(nullable = false)
    private boolean published = false;

    @Column(name = "logo_url", length = 400)
    private String logoUrl;

    @Column(name = "primary_color", nullable = false, length = 20)
    private String primaryColor = "#0f766e";

    @Column(name = "secondary_color", nullable = false, length = 20)
    private String secondaryColor = "#0f172a";

    @Column(name = "font_family", length = 60)
    private String fontFamily;

    @Column(name = "background_color", length = 20)
    private String backgroundColor;

    @Column(name = "text_size_scale", nullable = false, length = 10)
    private String textSizeScale = "MEDIUM";

    @Column(length = 200)
    private String tagline;

    @Column(name = "hero_heading", length = 200)
    private String heroHeading;

    @Column(name = "hero_subheading", length = 400)
    private String heroSubheading;

    @Column(name = "about_content", length = 4000)
    private String aboutContent;

    @Column(name = "mission_content", length = 4000)
    private String missionContent;

    @Column(name = "contact_email", length = 180)
    private String contactEmail;

    @Column(name = "contact_phone", length = 30)
    private String contactPhone;

    @Column(name = "contact_address", length = 400)
    private String contactAddress;

    @Column(name = "facebook_url", length = 300)
    private String facebookUrl;

    @Column(name = "instagram_url", length = 300)
    private String instagramUrl;

    @Column(name = "linkedin_url", length = 300)
    private String linkedinUrl;

    @Column(name = "youtube_url", length = 300)
    private String youtubeUrl;

    @Column(name = "seo_title", length = 200)
    private String seoTitle;

    @Column(name = "seo_description", length = 400)
    private String seoDescription;

    @Column(name = "seo_keywords", length = 300)
    private String seoKeywords;

    @Column(name = "banners_json", length = 4000)
    private String bannersJson;

    @Column(name = "nav_items_json", length = 2000)
    private String navItemsJson;

    @Column(name = "footer_columns_json", length = 2000)
    private String footerColumnsJson;

    /** Homepage stat tiles, e.g. `[{"label":"Organizations","value":"480+"}]` — same small-repeatable-array-as-JSON convention as bannersJson. */
    @Column(name = "stats_json", length = 2000)
    private String statsJson;

    @Column(name = "privacy_content", columnDefinition = "text")
    private String privacyContent;

    @Column(name = "terms_content", columnDefinition = "text")
    private String termsContent;

    @Column(name = "security_content", columnDefinition = "text")
    private String securityContent;

    /** Per-page hero banner image URLs, e.g. `{"home":"https://…","features":"https://…"}` — one entry per
     * marketing page (home/features/solutions/pricing/testimonials/blog/about/contact). A page with no entry
     * (or an empty string) falls back to the flat brand-colour hero background. */
    @Column(name = "page_banners_json", length = 3000)
    private String pageBannersJson;
}
