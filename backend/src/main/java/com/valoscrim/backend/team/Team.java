package com.valoscrim.backend.team;

import com.valoscrim.backend.common.enums.TeamRole;
import com.valoscrim.backend.user.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import jakarta.persistence.Embedded;

@Entity
@Table(name = "teams")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Team {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String name;

    @Column(length = 5)
    private String tag;

    private int wins;
    private int losses;

    private Long ownerId;

    @OneToMany(mappedBy = "team", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<TeamMember> members = new HashSet<>();

    @OneToMany(mappedBy = "team", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<TeamReview> reviews = new HashSet<>();

    @OneToMany(mappedBy = "team", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<TeamInvite> invites = new HashSet<>();

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Embedded
    private TeamPreferences teamPreferences;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.wins = 0;
        this.losses = 0;
    }

    public boolean isOwner(User user) {
        if (user == null || this.ownerId == null) {
            return false;
        }
        return this.ownerId.equals(user.getId());
    }

    public boolean isMember(User user) {
        if (user == null || this.members == null) {
            return false;
        }
        return this.members.stream()
                .anyMatch(m -> m.getUser().getId().equals(user.getId()));
    }

    public boolean isFull(){
        int MAX_MEMBERS = 7;
        return this.members != null && this.members.size() >= MAX_MEMBERS;
    }

    public void addMember(TeamMember member) {
        if (member == null) return;
        if (this.members == null) {
            this.members = new HashSet<>();
        }
        members.add(member);
        member.setTeam(this);
    }

    public void removeMember(TeamMember member) {
        if (member == null) return;
        members.remove(member);
        member.setTeam(null);
    }

    public void assignOwner(TeamMember newOwnerMember) {
        if (newOwnerMember == null || newOwnerMember.getUser() == null) {
            throw new IllegalArgumentException("New owner member is required");
        }

        Long newOwnerUserId = newOwnerMember.getUser().getId();

        for (TeamMember member : members) {
            if (member.getRole() == TeamRole.OWNER && !member.getUser().getId().equals(newOwnerUserId)) {
                member.setRole(TeamRole.CAPTAIN);
            }
        }

        newOwnerMember.setRole(TeamRole.OWNER);
        this.ownerId = newOwnerUserId;
    }
}