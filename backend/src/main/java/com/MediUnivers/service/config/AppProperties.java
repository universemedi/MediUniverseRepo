package com.MediUnivers.service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "mediunivers")
public record AppProperties(String issuerUri, String frontendBaseUrl, String frontendOauthCallbackPath) {

    public String frontendRedirectUri() {
        return frontendBaseUrl + frontendOauthCallbackPath;
    }
}
