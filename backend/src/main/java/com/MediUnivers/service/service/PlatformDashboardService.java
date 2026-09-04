package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.Lead;
import com.MediUnivers.service.domain.LeadStatus;
import com.MediUnivers.service.domain.ModuleGroup;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.domain.OrgStatus;
import com.MediUnivers.service.domain.Subscription;
import com.MediUnivers.service.domain.SubscriptionStatus;
import com.MediUnivers.service.dto.ExpiringOrganizationDto;
import com.MediUnivers.service.dto.PlatformDashboardDto;
import com.MediUnivers.service.dto.PlatformDashboardStatsDto;
import com.MediUnivers.service.repository.LeadRepository;
import com.MediUnivers.service.repository.OrganizationRepository;
import com.MediUnivers.service.repository.SubscriptionRepository;
import com.MediUnivers.service.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Cross-organization aggregates for the platform's own Dashboard page — the
 * SaaS owner's view (live customers, the demo pipeline, module popularity,
 * subscription revenue), never a tenant-facing screen. Revenue fields are
 * only ever populated for Super Admin; every other platform role gets the
 * same shape with those fields null/empty (see #dashboard).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlatformDashboardService {

    private static final List<OrgStatus> LIVE_STATUSES =
            List.of(OrgStatus.ACTIVE, OrgStatus.TRIAL, OrgStatus.GRACE_PERIOD);
    private static final String DEMO_SOURCE = "REQUEST_DEMO";
    /** The business modules a plan/org-type can actually unlock — PLATFORM/ORG/BILLING/PATIENT aren't "selected" the same way. */
    private static final List<ModuleGroup> BUSINESS_MODULES =
            List.of(ModuleGroup.CLINIC, ModuleGroup.PHARMACY, ModuleGroup.LAB, ModuleGroup.CRM, ModuleGroup.CMS);

    private final OrganizationRepository organizationRepository;
    private final LeadRepository leadRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final CurrentUserService currentUserService;

    public PlatformDashboardDto dashboard() {
        boolean revenueVisible = "SUPER_ADMIN".equals(currentUserService.require().getRole().getCode());

        List<Organization> liveOrgs = organizationRepository.findByStatusIn(LIVE_STATUSES);
        List<Lead> demoLeads = leadRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(l -> DEMO_SOURCE.equals(l.getSource()))
                .toList();
        List<Subscription> subscriptions = revenueVisible ? subscriptionRepository.findAllByOrderByStartDateDesc() : List.of();

        return new PlatformDashboardDto(
                stats(liveOrgs, demoLeads, subscriptions, revenueVisible),
                expiringSoon(liveOrgs),
                modulePopularity(liveOrgs),
                demoConversionTrend(demoLeads),
                subscriptionTypeMix(liveOrgs),
                revenueVisible ? subscriptionRevenueTrend(subscriptions) : List.of());
    }

    private PlatformDashboardStatsDto stats(List<Organization> liveOrgs, List<Lead> demoLeads,
                                             List<Subscription> subscriptions, boolean revenueVisible) {
        Instant thirtyDaysAgo = Instant.now().minus(30, ChronoUnit.DAYS);
        long activeOrganizations = liveOrgs.size();
        long newOrganizationsLast30Days = liveOrgs.stream().filter(o -> o.getCreatedAt().isAfter(thirtyDaysAgo)).count();

        long openDemoRequests = demoLeads.stream()
                .filter(l -> l.getStatus() != LeadStatus.WON && l.getStatus() != LeadStatus.LOST).count();
        long newDemoRequestsLast30Days = demoLeads.stream().filter(l -> l.getCreatedAt().isAfter(thirtyDaysAgo)).count();

        long expiringWithin30Days = expiringSoon(liveOrgs).size();

        long wonDemos = demoLeads.stream().filter(l -> l.getStatus() == LeadStatus.WON).count();
        long lostDemos = demoLeads.stream().filter(l -> l.getStatus() == LeadStatus.LOST).count();
        Double conversionRate = (wonDemos + lostDemos) == 0 ? null : (wonDemos * 100.0) / (wonDemos + lostDemos);

        BigDecimal revenueThisMonth = null;
        BigDecimal revenueLastMonth = null;
        if (revenueVisible) {
            YearMonth thisMonth = YearMonth.now();
            revenueThisMonth = paidRevenueForMonth(subscriptions, thisMonth);
            revenueLastMonth = paidRevenueForMonth(subscriptions, thisMonth.minusMonths(1));
        }

        return new PlatformDashboardStatsDto(activeOrganizations, newOrganizationsLast30Days,
                openDemoRequests, newDemoRequestsLast30Days, expiringWithin30Days, conversionRate,
                revenueVisible, revenueThisMonth, revenueLastMonth);
    }

    /** Money actually collected — free trials never charge, and a subscription stuck at PENDING_PAYMENT never got paid. */
    private BigDecimal paidRevenueForMonth(List<Subscription> subscriptions, YearMonth month) {
        return subscriptions.stream()
                .filter(s -> !s.isFreeTrial() && s.getStatus() != SubscriptionStatus.PENDING_PAYMENT)
                .filter(s -> YearMonth.from(s.getStartDate()).equals(month))
                .map(Subscription::getPriceWithTax)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<ExpiringOrganizationDto> expiringSoon(List<Organization> liveOrgs) {
        LocalDate today = LocalDate.now();
        LocalDate monthOut = today.plusDays(30);
        return liveOrgs.stream()
                .filter(o -> o.getRenewsOn() != null && !o.getRenewsOn().isBefore(today) && !o.getRenewsOn().isAfter(monthOut))
                .sorted(Comparator.comparing(Organization::getRenewsOn))
                .map(o -> new ExpiringOrganizationDto(o.getId(), o.getName(),
                        o.getPlan() != null ? o.getPlan().getName() : null, o.getRenewsOn(),
                        ChronoUnit.DAYS.between(today, o.getRenewsOn())))
                .toList();
    }

    private List<Map<String, Object>> modulePopularity(List<Organization> liveOrgs) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (ModuleGroup module : BUSINESS_MODULES) {
            long count = liveOrgs.stream()
                    .filter(o -> o.getOrgType() != null && o.getPlan() != null)
                    .filter(o -> o.getOrgType().getModules().contains(module) && o.getPlan().getModules().contains(module))
                    .count();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", capitalize(module.name()));
            row.put("Organizations", count);
            rows.add(row);
        }
        return rows;
    }

    /** Last 6 months, cohort by the demo request's own creation month — how many of that month's requests have since gone live. */
    private List<Map<String, Object>> demoConversionTrend(List<Lead> demoLeads) {
        DateTimeFormatter monthLabel = DateTimeFormatter.ofPattern("MMM");
        YearMonth current = YearMonth.now();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = current.minusMonths(i);
            Instant start = ym.atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            Instant end = ym.plusMonths(1).atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            List<Lead> cohort = demoLeads.stream()
                    .filter(l -> !l.getCreatedAt().isBefore(start) && l.getCreatedAt().isBefore(end))
                    .toList();
            long converted = cohort.stream().filter(l -> l.getStatus() == LeadStatus.WON).count();

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", ym.format(monthLabel));
            row.put("Demo requests", (long) cohort.size());
            row.put("Converted to live", converted);
            rows.add(row);
        }
        return rows;
    }

    private List<Map<String, Object>> subscriptionTypeMix(List<Organization> liveOrgs) {
        Map<String, Long> counts = liveOrgs.stream()
                .filter(o -> o.getPlan() != null)
                .collect(Collectors.groupingBy(o -> o.getPlan().getName(), LinkedHashMap::new, Collectors.counting()));
        return counts.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .map(e -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("name", e.getKey());
                    row.put("Organizations", e.getValue());
                    return row;
                })
                .toList();
    }

    private List<Map<String, Object>> subscriptionRevenueTrend(List<Subscription> subscriptions) {
        DateTimeFormatter monthLabel = DateTimeFormatter.ofPattern("MMM");
        YearMonth current = YearMonth.now();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = current.minusMonths(i);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", ym.format(monthLabel));
            row.put("Revenue", paidRevenueForMonth(subscriptions, ym));
            rows.add(row);
        }
        return rows;
    }

    private String capitalize(String s) {
        return s.charAt(0) + s.substring(1).toLowerCase(Locale.ROOT);
    }
}
