package com.MediUnivers.service.dto;

import java.time.Instant;

public record SampleCollectionDto(
        Long id, String collectionNumber, String sampleTypes, String status, String remarks,
        Instant collectedAt, String collectedByName
) {
}
