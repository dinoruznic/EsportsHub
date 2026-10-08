package com.esportshub.backend.demo;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "esportshub.demo.enabled", havingValue = "true")
public class DemoDataService {

    private final DemoCleaner demoCleaner;
    private final DemoSeeder demoSeeder;

    @Transactional
    public DemoResetResponse reset() {
        demoCleaner.clean();
        return demoSeeder.seed();
    }
}
