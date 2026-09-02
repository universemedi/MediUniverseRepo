package com.MediUnivers.service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "mediunivers")
public record AppProperties(
        String issuerUri,
        String frontendBaseUrl,
        String frontendOauthCallbackPath,
        /** Comma-separated extra origins to allow via CORS, beyond the platform's own frontend
         * origin and its "*.&lt;domain&gt;" org-subdomain wildcard — for local testing of a fully
         * custom (non-subdomain) org domain, e.g. a hosts-file entry. Blank in production. */
        String extraCorsOrigins) {

    public String frontendRedirectUri() {
        return frontendBaseUrl + frontendOauthCallbackPath;
    }
}
