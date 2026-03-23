package com.valoscrim.backend.match;

import com.valoscrim.backend.common.enums.MatchStatus;
import com.valoscrim.backend.common.enums.ServerRegion;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MatchRepository extends JpaRepository<ScrimMatch, Long> {
    List<ScrimMatch> findByStatusOrderByScheduledTimeAsc(MatchStatus status);

    List<ScrimMatch> findByTeamHomeIdOrTeamAwayId(Long teamId1, Long teamId2);

    @Query("""
        SELECT DISTINCT m
        FROM ScrimMatch m
        LEFT JOIN FETCH m.teamHome
        LEFT JOIN FETCH m.teamAway
        LEFT JOIN FETCH m.players p
        LEFT JOIN FETCH p.user
        LEFT JOIN FETCH p.team
        WHERE m.status = :status
    """)
    List<ScrimMatch> findByStatusWithDetails(@Param("status") MatchStatus status);

    @Query("""
        SELECT DISTINCT m
        FROM ScrimMatch m
        LEFT JOIN FETCH m.teamHome
        LEFT JOIN FETCH m.teamAway
        LEFT JOIN FETCH m.players p
        LEFT JOIN FETCH p.user
        LEFT JOIN FETCH p.team
        WHERE m.id = :id
    """)
    Optional<ScrimMatch> findByIdWithLobbyData(@Param("id") Long id);

    @Query("""
        SELECT DISTINCT m
        FROM ScrimMatch m
        LEFT JOIN FETCH m.players p
        LEFT JOIN FETCH p.user
        LEFT JOIN FETCH p.team
        WHERE m.id = :id
    """)
    Optional<ScrimMatch> findByIdWithPlayers(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM ScrimMatch m WHERE m.id = :id")
    Optional<ScrimMatch> findByIdForUpdate(@Param("id") Long id);


    List<ScrimMatch> findByStatusOrderByCreatedAtDesc(MatchStatus status);

    List<ScrimMatch> findByStatusAndServerLocationOrderByScheduledTimeAsc(
            MatchStatus status,
            ServerRegion serverLocation
    );

    @Query("""
    SELECT m
    FROM ScrimMatch m
    LEFT JOIN m.players p ON (p.lineupSlotStatus = 'STARTER' OR p.participantType = 'SOLO')
    LEFT JOIN p.user u
    WHERE m.status = :status
    GROUP BY m.id
    ORDER BY ABS(AVG(u.mmrElo) - :targetMmr) ASC
    """)
    List<ScrimMatch> findMatchesByClosestMmr(
            @Param("status") MatchStatus status,
            @Param("targetMmr") double targetMmr
    );

    @Query("""
    SELECT m
    FROM ScrimMatch m
    LEFT JOIN m.players p ON (p.lineupSlotStatus = 'STARTER' OR p.participantType = 'SOLO')
    LEFT JOIN p.user u
    WHERE m.status = :status
    GROUP BY m.id
    ORDER BY AVG(u.mmrElo) ASC
    """)
    List<ScrimMatch> findByStatusOrderByMmrAsc(@Param("status") MatchStatus status);

    @Query("""
    SELECT m
    FROM ScrimMatch m
    LEFT JOIN m.players p ON (p.lineupSlotStatus = 'STARTER' OR p.participantType = 'SOLO')
    LEFT JOIN p.user u
    WHERE m.status = :status
    GROUP BY m.id
    ORDER BY AVG(u.mmrElo) DESC
    """)
    List<ScrimMatch> findByStatusOrderByMmrDesc(@Param("status") MatchStatus status);

    @Query("""
        SELECT COUNT(m) > 0 
        FROM ScrimMatch m 
        JOIN m.players p 
        WHERE m.status = :status 
          AND p.user.username = :username 
          AND p.participantType = :participantType
    """)
    boolean existsActiveLobbyForUser(
            @Param("status") MatchStatus status,
            @Param("username") String username,
            @Param("participantType") com.valoscrim.backend.common.enums.ParticipantType participantType
    );
}