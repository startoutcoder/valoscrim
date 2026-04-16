package com.valoscrim.backend.match;

import com.valoscrim.backend.common.enums.MatchStatus;
import com.valoscrim.backend.common.enums.MatchType;
import com.valoscrim.backend.common.enums.ParticipantType;
import com.valoscrim.backend.common.enums.ServerRegion;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MatchRepository extends JpaRepository<ScrimMatch, Long> {

    @Query("""
        SELECT DISTINCT m
        FROM ScrimMatch m
        LEFT JOIN FETCH m.teamHome
        LEFT JOIN FETCH m.teamAway
        LEFT JOIN FETCH m.players p
        LEFT JOIN FETCH p.user u
        LEFT JOIN FETCH p.team t
        WHERE m.status = :status
          AND (:matchType IS NULL OR m.matchType = :matchType)
          AND (:serverLocation IS NULL OR m.serverLocation = :serverLocation)
    """)
    List<ScrimMatch> findMatchesWithFilters(
            @Param("status") MatchStatus status,
            @Param("matchType") MatchType matchType,
            @Param("serverLocation") ServerRegion serverLocation
    );

    List<ScrimMatch> findByTeamHomeIdOrTeamAwayId(Long teamId1, Long teamId2);

    @Query("""
        SELECT DISTINCT m FROM ScrimMatch m
        LEFT JOIN FETCH m.teamHome
        LEFT JOIN FETCH m.teamAway
        LEFT JOIN FETCH m.players p
        LEFT JOIN FETCH p.user
        LEFT JOIN FETCH p.team
        WHERE m.id = :id
    """)
    Optional<ScrimMatch> findByIdWithLobbyData(@Param("id") Long id);

    @Query("""
        SELECT DISTINCT m FROM ScrimMatch m
        LEFT JOIN FETCH m.players p
        LEFT JOIN FETCH p.user
        LEFT JOIN FETCH p.team
        WHERE m.id = :id
    """)
    Optional<ScrimMatch> findByIdWithPlayers(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "javax.persistence.lock.timeout", value = "0")})
    @Query("SELECT m FROM ScrimMatch m WHERE m.id = :id")
    Optional<ScrimMatch> findByIdForUpdate(@Param("id") Long id);

    @Query("""
        SELECT DISTINCT m
        FROM ScrimMatch m
        LEFT JOIN FETCH m.teamHome
        LEFT JOIN FETCH m.teamAway
        LEFT JOIN FETCH m.players p
        LEFT JOIN FETCH p.user u
        LEFT JOIN FETCH p.team t
        WHERE m.id IN (
            SELECT p2.match.id 
            FROM ScrimMatchPlayer p2 
            WHERE p2.user.username = :username
        ) 
        AND m.status IN ('OPEN', 'SCHEDULED', 'IN_PROGRESS')
    """)
    List<ScrimMatch> findMyActiveMatchesWithDetails(@Param("username") String username);

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
            @Param("participantType") ParticipantType participantType
    );

    @Query("""
        SELECT m
        FROM ScrimMatch m
        JOIN m.players p
        WHERE m.status = :status
          AND p.user.username = :username
          AND p.participantType = :participantType
    """)
    List<ScrimMatch> findActiveMatchesByUsernameAndType(
            @Param("status") MatchStatus status,
            @Param("username") String username,
            @Param("participantType") ParticipantType participantType
    );
}