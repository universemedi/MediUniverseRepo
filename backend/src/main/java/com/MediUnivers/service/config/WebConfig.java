package com.MediUnivers.service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Serves locally-stored uploads (see FileStorageService) back out as static files. */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final String uploadsDir;

    public WebConfig(@Value("${mediunivers.uploads-dir}") String uploadsDir) {
        this.uploadsDir = uploadsDir;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/api/public/uploads/**")
                .addResourceLocations("file:" + uploadsDir + "/");
    }
}
