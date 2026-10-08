package com.esportshub.backend.demo;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/demo")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@ConditionalOnProperty(name = "esportshub.demo.enabled", havingValue = "true")
public class DemoController {

    private final DemoDataService demoDataService;
    private final DemoRunner demoRunner;

    @PostMapping("/reset")
    public DemoResetResponse reset() {
        return demoDataService.reset();
    }

    @PostMapping("/start")
    public DemoStatusResponse start(@RequestBody(required = false) DemoStartRequest request) {
        return demoRunner.start(request == null ? null : request.tournamentId());
    }

    @PostMapping("/stop")
    public DemoStatusResponse stop() {
        return demoRunner.stop();
    }

    @GetMapping("/status")
    public DemoStatusResponse status() {
        return demoRunner.status();
    }
}
