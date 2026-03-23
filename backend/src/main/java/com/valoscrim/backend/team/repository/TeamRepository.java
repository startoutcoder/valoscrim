package com.valoscrim.backend.team.repository;

import com.valoscrim.backend.team.Team;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TeamRepository extends JpaRepository<Team, Long> {
    boolean existsByName(String name);
    List<Team> findByNameContainingIgnoreCase(String name);
    List<Team> findByOwnerId(Long ownerId);

    @Query("SELECT t FROM Team t WHERE SIZE(t.members) < 7")
    Page<Team> findPublicRecruitingTeams(Pageable pageable);

    @Query("""
        SELECT DISTINCT t
        FROM Team t
        LEFT JOIN FETCH t.members m
        LEFT JOIN FETCH m.user
        WHERE t.id = :id
    """)
    Optional<Team> findByIdWithMembersAndUsers(@Param("id") Long id);
}