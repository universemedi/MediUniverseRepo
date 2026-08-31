package com.MediUnivers.service.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One row per organization — everything an Org Owner configures on the
 * "Branding" and "SEO" screens of the Website Builder. The public site
 * (spec: "Website Builder") is a template rendered from this plus Services/
 * Gallery/Testimonials/Blogs and the org's own Doctors/Departments.
 */
@Entity
@Table(name = "website_configs")
@Getter
@Setter
@NoArgsConstructor
public class WebsiteConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organization_id", unique = true)
    private Organization organization;

    /** Kept for backward compatibility; templateId is the live reference into the WebsiteTemplate catalog (req #9). */
    @Column(name = "template_code", nullable = false, length = 30)
    private String templateCode = "CLASSIC";

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

    @Column(name = "banners_json", length = 4000)
    private String bannersJson;

    @Column(name = "nav_items_json", length = 2000)
    private String navItemsJson;

    @Column(name = "footer_columns_json", length = 2000)
    private String footerColumnsJson;

    @Column(length = 200)
    private String tagline;

    @Column(name = "hero_heading", length = 200)
    private String heroHeading;

    @Column(name = "hero_subheading", length = 400)
    private String heroSubheading;

    @Column(name = "about_content", length = 4000)
    private String aboutContent;

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

    @Column(name = "twitter_url", length = 300)
    private String twitterUrl;

    @Column(name = "linkedin_url", length = 300)
    private String linkedinUrl;

    @Column(name = "youtube_url", length = 300)
    private String youtubeUrl;

    @Column(name = "whatsapp_number", length = 30)
    private String whatsappNumber;

    @Column(name = "seo_title", length = 200)
    private String seoTitle;

    @Column(name = "seo_description", length = 400)
    private String seoDescription;

    @Column(name = "seo_keywords", length = 300)
    private String seoKeywords;

    @Column(name = "booking_enabled", nullable = false)
    private boolean bookingEnabled = true;
}
