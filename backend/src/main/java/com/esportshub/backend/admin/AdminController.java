package com.esportshub.backend.admin;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public PageResponse<AdminUserResponse> users(@RequestParam(defaultValue = "") String query,
                                                 @RequestParam(defaultValue = "") String role,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "20") int size) {
        return adminService.users(query, role, page, size);
    }

    @PostMapping("/users/{username}/roles")
    public List<String> grantRole(@PathVariable String username, @Valid @RequestBody RoleGrantRequest request) {
        return adminService.grantRole(username, request);
    }

    @DeleteMapping("/users/{username}/roles/{role}")
    public List<String> revokeRole(@AuthenticationPrincipal UserDetails principal,
                                   @PathVariable String username,
                                   @PathVariable String role) {
        return adminService.revokeRole(principal.getUsername(), username, role);
    }

    @GetMapping("/stats")
    public AdminStatsResponse stats() {
        return adminService.stats();
    }
}
