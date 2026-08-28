package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.PlanDto;
import com.MediUnivers.service.service.PlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class PlanController {

    private final PlanService planService;

    @GetMapping("/api/public/plans")
    public List<PlanDto> list() {
        return planService.listAll();
    }
}
