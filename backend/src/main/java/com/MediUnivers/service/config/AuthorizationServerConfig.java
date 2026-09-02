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
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.security.oauth2.core.oidc.OidcScopes;
import org.springframework.security.oauth2.server.authorization.InMemoryOAuth2AuthorizationConsentService;
import org.springframework.security.oauth2.server.authorization.InMemoryOAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationConsentService;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2AuthorizationCodeRequestAuthenticationContext;
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2AuthorizationCodeRequestAuthenticationException;
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2AuthorizationCodeRequestAuthenticationProvider;
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2AuthorizationCodeRequestAuthenticationToken;
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2AuthorizationCodeRequestAuthenticationValidator;
import org.springframework.security.oauth2.server.authorization.client.InMemoryRegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.security.oauth2.server.authorization.token.JwtEncodingContext;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenCustomizer;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.util.matcher.MediaTypeRequestMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.util.UriComponents;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.util.List;
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
                        authorizationServer
                                .oidc(Customizer.withDefaults())
                                .authorizationEndpoint(endpoint ->
                                        endpoint.authenticationProviders(this::useOrgAwareRedirectUriValidator))
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

    /**
     * Only one redirect_uri is registered on the client (the platform's own
     * {@code /oauth/callback}) — but the same SPA is also served on every organization's own
     * subdomain/custom domain (spec: "the org owner logs in through their own website"), so a
     * login started from {@code sunrise.mediunivers.com} has to redirect back to
     * {@code sunrise.mediunivers.com/oauth/callback}, not the platform's fixed one. Spring
     * Authorization Server's default validator requires an exact match against the registered
     * set, which would reject every one of those (400 invalid redirect_uri). This swaps in a
     * validator that accepts any redirect_uri whose origin is one of {@link TrustedOrigins} — the
     * same trust boundary already used for CORS — and whose path matches the registered
     * callback path, keeping the scope check but dropping the single-fixed-origin restriction.
     */
    private void useOrgAwareRedirectUriValidator(List<AuthenticationProvider> authenticationProviders) {
        java.util.function.Consumer<OAuth2AuthorizationCodeRequestAuthenticationContext> redirectUriValidator =
                this::validateRedirectUri;
        for (AuthenticationProvider provider : authenticationProviders) {
            if (provider instanceof OAuth2AuthorizationCodeRequestAuthenticationProvider codeRequestProvider) {
                codeRequestProvider.setAuthenticationValidator(
                        redirectUriValidator.andThen(
                                OAuth2AuthorizationCodeRequestAuthenticationValidator.DEFAULT_SCOPE_VALIDATOR));
            }
        }
    }

    private void validateRedirectUri(OAuth2AuthorizationCodeRequestAuthenticationContext authenticationContext) {
        OAuth2AuthorizationCodeRequestAuthenticationToken authorizationCodeRequestAuthentication =
                authenticationContext.getAuthentication();
        RegisteredClient registeredClient = authenticationContext.getRegisteredClient();
        String requestedRedirectUri = authorizationCodeRequestAuthentication.getRedirectUri();

        if (!StringUtils.hasText(requestedRedirectUri)) {
            // redirect_uri is REQUIRED for OpenID Connect, which this client always requests.
            throwRedirectUriError(authorizationCodeRequestAuthentication, registeredClient);
            return;
        }

        UriComponents requestedRedirect;
        try {
            requestedRedirect = UriComponentsBuilder.fromUriString(requestedRedirectUri).build();
        } catch (Exception ex) {
            throwRedirectUriError(authorizationCodeRequestAuthentication, registeredClient);
            return;
        }
        if (requestedRedirect.getFragment() != null) {
            throwRedirectUriError(authorizationCodeRequestAuthentication, registeredClient);
            return;
        }

        String requestedPath = requestedRedirect.getPath() != null ? requestedRedirect.getPath() : "";
        String registeredPath = URI.create(appProperties.frontendRedirectUri()).getPath();
        if (!requestedPath.equals(registeredPath)) {
            throwRedirectUriError(authorizationCodeRequestAuthentication, registeredClient);
            return;
        }

        String requestedOrigin = requestedRedirect.getScheme() + "://" + requestedRedirect.getHost()
                + (requestedRedirect.getPort() >= 0 ? ":" + requestedRedirect.getPort() : "");
        if (!TrustedOrigins.matches(requestedOrigin, appProperties)) {
            throwRedirectUriError(authorizationCodeRequestAuthentication, registeredClient);
        }
    }

    private void throwRedirectUriError(
            OAuth2AuthorizationCodeRequestAuthenticationToken authorizationCodeRequestAuthentication,
            RegisteredClient registeredClient) {
        OAuth2Error error = new OAuth2Error(OAuth2ErrorCodes.INVALID_REQUEST,
                "OAuth 2.0 Parameter: " + OAuth2ParameterNames.REDIRECT_URI, null);
        // Matches the framework default: an invalid redirect_uri must not itself be redirected to.
        OAuth2AuthorizationCodeRequestAuthenticationToken result = new OAuth2AuthorizationCodeRequestAuthenticationToken(
                authorizationCodeRequestAuthentication.getAuthorizationUri(),
                authorizationCodeRequestAuthentication.getClientId(),
                (Authentication) authorizationCodeRequestAuthentication.getPrincipal(), null,
                authorizationCodeRequestAuthentication.getState(), authorizationCodeRequestAuthentication.getScopes(),
                authorizationCodeRequestAuthentication.getAdditionalParameters());
        result.setAuthenticated(true);
        throw new OAuth2AuthorizationCodeRequestAuthenticationException(error, result);
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
