package com.valoscrim.backend.match;

import com.valoscrim.backend.common.enums.MatchStatus;
import com.valoscrim.backend.common.enums.MatchType;
import com.valoscrim.backend.common.enums.ParticipantType;
import com.valoscrim.backend.common.enums.ServerRegion;
import com.valoscrim.backend.common.enums.MatchSide;
import com.valoscrim.backend.common.enums.LineupSlotStatus;
import com.valoscrim.backend.team.Team;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "scrim_matches", indexes = {
        @Index(name = "idx_match_status_time", columnList = "status, scheduledTime"),
        @Index(name = "idx_match_status_avg_mmr", columnList = "status, averageMmr")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class ScrimMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "team_home_id")
    private Team teamHome;

    @ManyToOne
    @JoinColumn(name = "team_away_id")
    private Team teamAway;

    @Column(name = "home_team_ready")
    private boolean homeTeamReady = false;

    @Column(name = "away_team_ready")
    private boolean awayTeamReady = false;

    private LocalDateTime scheduledTime;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private MatchStatus status;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private MatchType matchType;

    private String mapName;

    @Enumerated(EnumType.STRING)
    private ServerRegion serverLocation;

    @Column(length = 20)
    private String mapSelectionMode;

    @OneToMany(mappedBy = "match", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<ScrimMatchPlayer> players = new HashSet<>();

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Column(length = 50)
    private String partyCode;

    @Column(name = "home_score", nullable = false)
    @Builder.Default
    private Integer homeScore = 0;

    @Column(name = "away_score", nullable = false)
    @Builder.Default
    private Integer awayScore = 0;

    @Column(name = "average_mmr", nullable = false)
    @Builder.Default
    private Integer averageMmr = 0;

    public void addPlayer(ScrimMatchPlayer player) {
        if (player == null) return;
        players.add(player);
        player.setMatch(this);
        recalculateAverageMmr();
    }

    public void removePlayer(ScrimMatchPlayer player) {
        if (player == null) return;
        players.remove(player);
        player.setMatch(null);
        recalculateAverageMmr();
    }

    public void recalculateAverageMmr() {
        if (this.matchType == MatchType.TEAM) {
            double avg = this.players.stream()
                    .filter(p -> p.getParticipantType() == ParticipantType.TEAM_ROSTER)
                    .filter(p -> p.getMatchSide() == MatchSide.HOME)
                    .filter(p -> p.getLineupSlotStatus() == LineupSlotStatus.STARTER)
                    .filter(p -> p.getUser() != null && p.getUser().getMmrElo() != null)
                    .mapToInt(p -> p.getUser().getMmrElo())
                    .average()
                    .orElse(0.0);

            this.averageMmr = (int) Math.round(avg);
            return;
        }

        if (this.matchType == MatchType.SOLO) {
            double avg = this.players.stream()
                    .filter(p -> p.getParticipantType() == ParticipantType.SOLO)
                    .filter(p -> p.getUser() != null && p.getUser().getMmrElo() != null)
                    .mapToInt(p -> p.getUser().getMmrElo())
                    .average()
                    .orElse(0.0);

            this.averageMmr = (int) Math.round(avg);
            return;
        }

        this.averageMmr = 0;
    }

    public boolean isSoloFull() {
        return players.stream()
                .filter(p -> p.getParticipantType() == ParticipantType.SOLO)
                .count() >= 10;
    }
}