package com.MediUnivers.service.service;

import org.springframework.stereotype.Service;

import java.util.List;

/** Thin service wrapper around the static India locations catalog — no persistence needed for reference data that doesn't change at runtime. */
@Service
public class LocationService {

    public List<String> listStates() {
        return IndiaLocationsCatalog.stateNames();
    }

    public List<String> listCities(String state) {
        return IndiaLocationsCatalog.citiesFor(state);
    }
}
