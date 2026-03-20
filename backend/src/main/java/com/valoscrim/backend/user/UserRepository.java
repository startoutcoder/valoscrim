package com.valoscrim.backend.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsernameOrEmail(String username, String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    Optional<User> findByRiotPuuid(String username);
    Optional<User> findByDisplayName(String displayName);
    boolean existsByDisplayName(String displayName);

    @Query("""
        SELECT DISTINCT u
        FROM User u
        LEFT JOIN FETCH u.memberships m
        LEFT JOIN FETCH m.team
        WHERE u.displayName = :identifier
    """)
    Optional<User> findProfileByDisplayName(@Param("identifier") String identifier);

    @Query("""
        SELECT DISTINCT u
        FROM User u
        LEFT JOIN FETCH u.memberships m
        LEFT JOIN FETCH m.team
        WHERE u.username = :identifier OR u.email = :identifier
    """)
    Optional<User> findProfileByUsernameOrEmail(@Param("identifier") String identifier);

    @Query("""
    SELECT DISTINCT u
    FROM User u
    LEFT JOIN FETCH u.memberships m
    LEFT JOIN FETCH m.team
    WHERE u.username = :identifier
       OR u.email = :identifier
       OR u.displayName = :identifier
    """)
    Optional<User> findProfileByIdentifier(@Param("identifier") String identifier);
}