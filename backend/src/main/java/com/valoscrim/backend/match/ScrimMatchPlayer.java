package com.valoscrim.backend.match;

import com.valoscrim.backend.common.enums.LineupSlotStatus;
import com.valoscrim.backend.common.enums.MatchSide;
import com.valoscrim.backend.common.enums.ParticipantType;
import com.valoscrim.backend.team.Team;
import com.valoscrim.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "scrim_match_players",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_match_player_match_user", columnNames = {"match_id", "user_id"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScrimMatchPlayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private ScrimMatch match;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    @Column(nullable = false)
    private boolean isReady = false;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private ParticipantType participantType;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private MatchSide matchSide;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private LineupSlotStatus lineupSlotStatus;
}