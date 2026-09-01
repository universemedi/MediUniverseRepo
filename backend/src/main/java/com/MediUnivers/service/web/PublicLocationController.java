package com.MediUnivers.service.web;

import com.MediUnivers.service.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * India states/cities, served on demand instead of shipped as a static
 * frontend dataset — the full city catalog runs into the thousands, so
 * keeping it server-side and fetching only what's needed (all states up
 * front, cities per selected state) keeps the deployed frontend bundle
 * small and the page load fast.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/public/locations")
public class PublicLocationController {

    private final LocationService locationService;

    @GetMapping("/states")
    public List<String> states() {
        return locationService.listStates();
    }

    @GetMapping("/cities")
    public List<String> cities(@RequestParam String state) {
        return locationService.listCities(state);
    }
}
