package com.valoscrim.backend.team.repository;

import com.valoscrim.backend.team.Team;
import com.valoscrim.backend.team.TeamInvite;
import com.valoscrim.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TeamInviteRepository extends JpaRepository<TeamInvite, Long> {
    List<TeamInvite> findByInvitee(User invitee);
    boolean existsByTeamAndInvitee(Team team, User invitee);
}