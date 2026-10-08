package com.esportshub.backend.support;

import org.springframework.test.context.TestPropertySource;

@TestPropertySource(properties = {
        "esportshub.demo.enabled=true",
        "esportshub.demo.tick-millis=200",
        "esportshub.demo.ticks-per-map=3"
})
public abstract class AbstractDemoIntegrationTest extends AbstractIntegrationTest {
}
