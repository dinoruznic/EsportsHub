package com.esportshub.backend.demo;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/demo")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@ConditionalOnProperty(name = "esportshub.demo.enabled", havingValue = "true")
public class DemoController {

    private final DemoDataService demoDataService;

    @PostMapping("/reset")
    public DemoResetResponse reset() {
        return demoDataService.reset();
    }
}
