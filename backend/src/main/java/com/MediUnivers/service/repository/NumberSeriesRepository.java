package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.NumberSeries;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface NumberSeriesRepository extends JpaRepository<NumberSeries, Long> {

    /** Row-locked read so two simultaneous bookings can never get the same number. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select n from NumberSeries n where n.organization.id = :organizationId and n.code = :code")
    Optional<NumberSeries> lockByOrganizationAndCode(@Param("organizationId") Long organizationId, @Param("code") String code);

    Optional<NumberSeries> findByOrganizationIdAndCode(Long organizationId, String code);
}
