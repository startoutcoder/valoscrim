package com.valoscrim.backend.team;

import com.valoscrim.backend.common.enums.AgentPosition;
import com.valoscrim.backend.common.enums.TeamRole;
import com.valoscrim.backend.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "team_members",
        uniqueConstraints = {
            @UniqueConstraint(name = "uk_team_member_team_user", columnNames = {"team_id", "user_id"})
        }
)
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@Builder
public class TeamMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TeamRole role;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private AgentPosition preferredPosition;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime joinedAt;
}