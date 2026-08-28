package com.MediUnivers.service.service;

import com.MediUnivers.service.domain.NumberSeries;
import com.MediUnivers.service.domain.Organization;
import com.MediUnivers.service.domain.ResetPolicy;
import com.MediUnivers.service.repository.NumberSeriesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Generic, atomic document-numbering engine used by every module (patient
 * IDs, appointment numbers, daily tokens, and eventually invoices, lab
 * orders, purchase orders, ...) instead of each module inventing its own
 * counter. See product spec Volume 3 Part 4 §19-23.
 *
 * REQUIRES_NEW + a pessimistic row lock so two concurrent bookings can never
 * walk away with the same number, and so a failed outer transaction doesn't
 * roll back (and thus reuse) a number that was already handed out.
 */
@Service
@RequiredArgsConstructor
public class NumberSeriesService {

    private final NumberSeriesRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String next(Organization organization, String code, String defaultPrefix, ResetPolicy defaultPolicy, int defaultPadding) {
        NumberSeries series = repository.lockByOrganizationAndCode(organization.getId(), code)
                .orElseGet(() -> {
                    NumberSeries created = new NumberSeries();
                    created.setOrganization(organization);
                    created.setCode(code);
                    created.setPrefix(defaultPrefix);
                    created.setPadding(defaultPadding);
                    created.setResetPolicy(defaultPolicy);
                    created.setCurrentNumber(0);
                    return repository.save(created);
                });

        if (shouldReset(series)) {
            series.setCurrentNumber(0);
            series.setLastResetOn(LocalDate.now());
        }
        series.setCurrentNumber(series.getCurrentNumber() + 1);
        repository.save(series);
        return series.format();
    }

    private boolean shouldReset(NumberSeries series) {
        if (series.getResetPolicy() == ResetPolicy.NEVER) return false;
        LocalDate last = series.getLastResetOn();
        LocalDate today = LocalDate.now();
        if (last == null) return true;
        return switch (series.getResetPolicy()) {
            case DAILY -> !last.isEqual(today);
            case MONTHLY -> last.getMonthValue() != today.getMonthValue() || last.getYear() != today.getYear();
            case YEARLY -> last.getYear() != today.getYear();
            case NEVER -> false;
        };
    }
}
