package com.MediUnivers.service.config;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

/**
 * The set of browser origins this platform trusts beyond its own frontend: every organization's
 * "&lt;subdomain&gt;.&lt;same domain&gt;" website (a different browser origin from the platform's
 * own, since a custom/sub domain is the whole point of an org's own site), plus whatever
 * {@code mediunivers.extra-cors-origins} lists for local testing of a fully custom domain. Shared
 * by {@link CorsConfig} (API access) and {@link AuthorizationServerConfig} (OAuth2 redirect_uri)
 * so a domain trusted for one is trusted for the other by construction, not by keeping two lists
 * in sync by hand.
 */
final class TrustedOrigins {

    private TrustedOrigins() {
    }

    /** Ant-style patterns ("http://*.host:port") for Spring's CorsConfiguration#setAllowedOriginPatterns. */
    static List<String> patterns(AppProperties appProperties) {
        List<String> patterns = new ArrayList<>();
        String frontendBaseUrl = appProperties.frontendBaseUrl();
        patterns.add(frontendBaseUrl);
        URI uri = URI.create(frontendBaseUrl);
        String portSuffix = uri.getPort() >= 0 ? ":" + uri.getPort() : "";
        patterns.add(uri.getScheme() + "://*." + uri.getHost() + portSuffix);
        if (appProperties.extraCorsOrigins() != null && !appProperties.extraCorsOrigins().isBlank()) {
            for (String origin : appProperties.extraCorsOrigins().split(",")) {
                if (!origin.isBlank()) {
                    patterns.add(origin.trim());
                }
            }
        }
        return patterns;
    }

    /** Whether a concrete request origin ("http://sunrise.localhost:3000") matches one of {@link #patterns}. */
    static boolean matches(String origin, AppProperties appProperties) {
        if (origin == null || origin.isBlank()) {
            return false;
        }
        for (String pattern : patterns(appProperties)) {
            int star = pattern.indexOf('*');
            if (star < 0) {
                if (pattern.equals(origin)) {
                    return true;
                }
            } else {
                String prefix = pattern.substring(0, star);
                String suffix = pattern.substring(star + 1);
                if (origin.startsWith(prefix) && origin.endsWith(suffix)) {
                    return true;
                }
            }
        }
        return false;
    }
}
