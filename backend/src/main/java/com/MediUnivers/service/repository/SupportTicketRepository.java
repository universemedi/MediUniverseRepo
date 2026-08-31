package com.MediUnivers.service.repository;

import com.MediUnivers.service.domain.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
}
