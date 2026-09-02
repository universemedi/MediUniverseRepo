package com.MediUnivers.service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Everything that isn't /oauth2/** or /api/**: mainly the browser-rendered
 * /login page a person sees when the SPA redirects them into the
 * Authorization Code flow. Uses Spring Security's built-in auto-generated
 * login form for now — swap in a branded template later without touching
 * any of the OAuth2 wiring (that part doesn't change).
 */
@Configuration
public class DefaultSecurityConfig {

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
    @Bean
    @Order(3)
    public SecurityFilterChain defaultSecurityFilterChain(HttpSecurity http, CorsConfigurationSource corsSource) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsSource))
                .authorizeHttpRequests(authorize -> authorize
                        // The STOMP handshake itself carries no session — WebSocketAuthChannelInterceptor
                        // validates the JWT on the STOMP CONNECT frame instead, same bearer token the SPA
                        // already holds.
                        .requestMatchers("/error", "/actuator/health", "/ws/**").permitAll()
                        .anyRequest().authenticated()
                )
                // No .loginPage(...) call on purpose: Spring Security auto-generates a
                // working login page at GET /login when none is configured.
                .formLogin(Customizer.withDefaults())
                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .invalidateHttpSession(true)
                        .clearAuthentication(true)
                        .deleteCookies("JSESSIONID"));

        return http.build();
    }
}
