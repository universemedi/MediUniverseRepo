package com.MediUnivers.service.web;

import com.MediUnivers.service.dto.OrgTypeDto;
import com.MediUnivers.service.service.OrgTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class OrgTypeController {

    private final OrgTypeService orgTypeService;

    /** Reference data — safe to expose publicly, it's shown on the signup / login screens. */
    @GetMapping("/api/public/org-types")
    public List<OrgTypeDto> list() {
        return orgTypeService.listAll();
    }
}
