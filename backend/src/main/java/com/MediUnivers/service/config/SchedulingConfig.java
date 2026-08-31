package com.MediUnivers.service.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Backs the Communication Engine's Queue → Worker processing (spec §14) and scheduled reminders (spec §17-18). */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
