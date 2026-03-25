package com.valoscrim.backend.team;

import com.valoscrim.backend.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "team_reviews", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"team_id", "reviewer_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamReview {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    private boolean isRecommended;

    @Column(length = 500)
    private String comment;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); }
}