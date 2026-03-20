package com.valoscrim.backend.team.repository;

import com.valoscrim.backend.team.Team;
import com.valoscrim.backend.team.TeamMember;
import com.valoscrim.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {
    boolean existsByTeamAndUser(Team team, User user);
    Optional<TeamMember> findByTeamAndUser(Team team, User user);
}
