package com.MediUnivers.service.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class CorsConfig {

    private final AppProperties appProperties;

    @Primary
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(TrustedOrigins.patterns(appProperties));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        // X-Signup-Token: the public self-serve signup flow's stand-in for a session
        // (POST /api/public/organizations/{id}/select-plan|select-custom-plan|subscribe/confirm) —
        // without it in the allow-list, every browser request carrying it fails CORS
        // preflight (curl-based testing never catches this since curl skips preflight).
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Signup-Token"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
