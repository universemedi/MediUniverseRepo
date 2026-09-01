package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.LabOrderStatus;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.domain.OrgStatus;
import com.MediUnivers.service.domain.SaleStatus;
import com.MediUnivers.service.dto.PlatformDashboardDto;
import com.MediUnivers.service.dto.PlatformDashboardStatsDto;
import com.MediUnivers.service.repository.AppointmentRepository;
import com.MediUnivers.service.repository.LabOrderRepository;
import com.MediUnivers.service.repository.OrganizationRepository;
import com.MediUnivers.service.repository.PharmacySaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Cross-organization aggregates for the platform's own Dashboard page.
 * Everything here scans across ALL organizations, unlike the per-module
 * dashboards (Clinic/Pharmacy/Lab/Billing) which are always org-scoped —
 * this must never be reused from a tenant-facing screen.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlatformDashboardService {

    private static final List<OrgStatus> LIVE_STATUSES =
            List.of(OrgStatus.ACTIVE, OrgStatus.TRIAL, OrgStatus.GRACE_PERIOD);
    private static final List<LabOrderStatus> PENDING_LAB_STATUSES = List.of(
            LabOrderStatus.SAMPLE_PENDING, LabOrderStatus.COLLECTED,
            LabOrderStatus.PROCESSING, LabOrderStatus.RESULT_READY);

    private final OrganizationRepository organizationRepository;
    private final AppointmentRepository appointmentRepository;
    private final PharmacySaleRepository pharmacySaleRepository;
    private final LabOrderRepository labOrderRepository;

    public PlatformDashboardDto dashboard() {
        return new PlatformDashboardDto(stats(), appointmentsRevenueTrend(), organizationsByType());
    }

    private PlatformDashboardStatsDto stats() {
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);

        long activeOrganizations = organizationRepository.countByStatusIn(LIVE_STATUSES);
        long newOrganizationsLast30Days = activeOrganizations
                - organizationRepository.countByStatusInAndCreatedAtBefore(
                        LIVE_STATUSES, today.minusDays(30).atStartOfDay(ZoneOffset.UTC).toInstant());

        long appointmentsToday = appointmentRepository.countByAppointmentDate(today);
        long appointmentsYesterday = appointmentRepository.countByAppointmentDate(yesterday);

        BigDecimal revenueToday = revenueForDay(today);
        BigDecimal revenueYesterday = revenueForDay(yesterday);

        long pendingLabResults = labOrderRepository.countByStatusIn(PENDING_LAB_STATUSES);

        return new PlatformDashboardStatsDto(
                activeOrganizations, newOrganizationsLast30Days,
                appointmentsToday, appointmentsYesterday,
                revenueToday, revenueYesterday,
                pendingLabResults);
    }

    private BigDecimal revenueForDay(LocalDate day) {
        Instant start = day.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant end = day.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        return pharmacySaleRepository.sumGrandTotalByStatusAndCreatedAtBetween(SaleStatus.COMPLETED, start, end);
    }

    private List<Map<String, Object>> appointmentsRevenueTrend() {
        DateTimeFormatter monthLabel = DateTimeFormatter.ofPattern("MMM");
        YearMonth current = YearMonth.now();
        List<Map<String, Object>> rows = new java.util.ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = current.minusMonths(i);
            LocalDate start = ym.atDay(1);
            LocalDate end = ym.atEndOfMonth();
            long appointments = appointmentRepository.countByAppointmentDateBetween(start, end);
            Instant startInstant = start.atStartOfDay(ZoneOffset.UTC).toInstant();
            Instant endInstant = end.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            BigDecimal revenue = pharmacySaleRepository.sumGrandTotalByStatusAndCreatedAtBetween(
                    SaleStatus.COMPLETED, startInstant, endInstant);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", ym.format(monthLabel));
            row.put("Appointments", appointments);
            row.put("Revenue", revenue);
            rows.add(row);
        }
        return rows;
    }

    private List<Map<String, Object>> organizationsByType() {
        List<Organization> orgs = organizationRepository.findByStatusIn(LIVE_STATUSES);
        Map<String, Long> counts = orgs.stream()
                .collect(Collectors.groupingBy(
                        o -> o.getOrgType().getName(), LinkedHashMap::new, Collectors.counting()));
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
}
