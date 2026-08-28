package com.MediUnivers.service.config;

import com.MediUnivers.service.domain.AppUser;
import com.MediUnivers.service.security.AppUserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
// FIXED: Corrected the package import location for Spring Boot 3.4+ / Auth Server 1.4+
import org.springframework.security.oauth2.server.authorization.config.annotation.web.configurers.OAuth2AuthorizationServerConfigurer;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.OidcScopes;
import org.springframework.security.oauth2.server.authorization.InMemoryOAuth2AuthorizationConsentService;
import org.springframework.security.oauth2.server.authorization.InMemoryOAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationConsentService;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.client.InMemoryRegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.security.oauth2.server.authorization.token.JwtEncodingContext;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenCustomizer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.util.matcher.MediaTypeRequestMatcher;
import org.springframework.web.cors.CorsConfigurationSource;

import java.time.Duration;
import java.util.UUID;

/**
 * This service acts as its OWN OAuth2 provider: the SPA never sends a raw
 * email/password to an API endpoint. Instead it redirects the browser to
 * /oauth2/authorize (Authorization Code + PKCE, no client secret because a
 * SPA can't keep one), the user authenticates on the login page rendered by
 * this server, and the SPA exchanges the returned code for a JWT access
 * token at /oauth2/token. That JWT is what every /api/** call presents.
 */
@Configuration
@RequiredArgsConstructor
public class AuthorizationServerConfig {

    private final AppProperties appProperties;

    @Bean
    @Order(1)
    public SecurityFilterChain authorizationServerSecurityFilterChain(HttpSecurity http) throws Exception {
        OAuth2AuthorizationServerConfigurer authorizationServerConfigurer =
                OAuth2AuthorizationServerConfigurer.authorizationServer();

        http
                .securityMatcher(authorizationServerConfigurer.getEndpointsMatcher())
                .cors(Customizer.withDefaults())
                .with(authorizationServerConfigurer, (authorizationServer) ->
                        authorizationServer.oidc(Customizer.withDefaults())
                )
                .authorizeHttpRequests((authorize) -> authorize.anyRequest().authenticated())
                .exceptionHandling((exceptions) -> exceptions
                        .defaultAuthenticationEntryPointFor(
                                new LoginUrlAuthenticationEntryPoint("/login"),
                                new MediaTypeRequestMatcher(MediaType.TEXT_HTML)
                        )
                );

        return http.build();
    }

    /** The one client MediUnivers ships: the React SPA. Public client (no secret) using PKCE. */
    @Bean
    public RegisteredClientRepository registeredClientRepository() {
        RegisteredClient webClient = RegisteredClient.withId(UUID.randomUUID().toString())
                .clientId("mediunivers-web")
                // Public client (SPA, no secret) — PKCE replaces client auth per OAuth 2.1.
                // CLIENT_SECRET_JWT was wrong here: it requires a shared secret to sign a
                // client assertion at the token endpoint, which was never set and which a
                // browser can't hold safely anyway. This was silently breaking POST /oauth2/token.
                .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
                .redirectUri(appProperties.frontendRedirectUri())
                .postLogoutRedirectUri(appProperties.frontendBaseUrl() + "/login")
                .scope(OidcScopes.OPENID)
                .scope(OidcScopes.PROFILE)
                .clientSettings(ClientSettings.builder()
                        .requireAuthorizationConsent(false)
                        .requireProofKey(true) // PKCE is mandatory for this public client
                        .build())
                .tokenSettings(TokenSettings.builder()
                        .accessTokenTimeToLive(Duration.ofMinutes(20))
                        .refreshTokenTimeToLive(Duration.ofDays(14))
                        .reuseRefreshTokens(false)
                        .build())
                .build();
        return new InMemoryRegisteredClientRepository(webClient);
    }

    @Bean
    public OAuth2AuthorizationService authorizationService() {
        return new InMemoryOAuth2AuthorizationService();
    }

    @Bean
    public OAuth2AuthorizationConsentService authorizationConsentService() {
        return new InMemoryOAuth2AuthorizationConsentService();
    }

    @Bean
    public AuthorizationServerSettings authorizationServerSettings() {
        return AuthorizationServerSettings.builder()
                .issuer(appProperties.issuerUri())
                .build();
    }

    /** Stamps role/portal/organization info onto every access token and ID token we issue. */
    @Bean
    public OAuth2TokenCustomizer<JwtEncodingContext> jwtTokenCustomizer() {
        return context -> {
            if (!(context.getPrincipal().getPrincipal() instanceof AppUserPrincipal principal)) {
                return;
            }
            AppUser user = principal.getUser();
            var claims = context.getClaims();
            claims.claim("name", user.getFullName());
            claims.claim("role", user.getRole().getCode());
            claims.claim("portal", user.getPortal().name());
            if (user.getOrganization() != null) {
                claims.claim("org_id", user.getOrganization().getId());
                claims.claim("org_type", user.getOrganization().getOrgType().getCode());
                claims.claim("plan_code", user.getOrganization().getPlan().getCode());
            }
        };
    }
}
