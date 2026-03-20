package com.valoscrim.backend.team.repository;

import com.valoscrim.backend.team.Team;
import com.valoscrim.backend.team.TeamReview;
import com.valoscrim.backend.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TeamReviewRepository extends JpaRepository<TeamReview, Long> {
    List<TeamReview> findByTeamOrderByCreatedAtDesc(Team team);
    boolean existsByTeamAndReviewer(Team team, User reviewer);
}
