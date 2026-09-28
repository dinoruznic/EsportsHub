package com.esportshub.backend.admin;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @PostMapping("/users/{username}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public List<String> grantRole(@PathVariable String username, @Valid @RequestBody RoleGrantRequest request) {
        return adminService.grantRole(username, request);
    }
}
