package com.esportshub.backend.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByRoles_Name(String roleName);
    List<User> findByRoles_NameOrderByUsernameAsc(String roleName);

    @Query("""
            select u from User u
            where (:pattern = '' or lower(u.username) like :pattern
                    or lower(coalesce(u.displayName, '')) like :pattern
                    or lower(u.email) like :pattern)
              and (:role = '' or exists (
                    select 1 from User other join other.roles r
                    where other.id = u.id and r.name = :role))
            """)
    Page<User> search(String pattern, String role, Pageable pageable);
}
