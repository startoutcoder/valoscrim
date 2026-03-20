package com.valoscrim.backend.team.service;

import com.valoscrim.backend.common.enums.MatchStatus;
import com.valoscrim.backend.match.MatchRepository;
import com.valoscrim.backend.match.ScrimMatch;
import com.valoscrim.backend.team.*;
import com.valoscrim.backend.team.dto.CreateReviewRequest;
import com.valoscrim.backend.team.dto.MatchHistoryResponse;
import com.valoscrim.backend.team.dto.TeamReviewResponse;
import com.valoscrim.backend.team.repository.TeamMemberRepository;
import com.valoscrim.backend.team.repository.TeamRepository;
import com.valoscrim.backend.team.repository.TeamReviewRepository;
import com.valoscrim.backend.user.User;
import com.valoscrim.backend.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TeamReviewService {

    private final TeamRepository teamRepository;
    private final TeamReviewRepository teamReviewRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final MatchRepository matchRepository;
    private final UserService userService;

    @Transactional(readOnly = true)
    public List<TeamReviewResponse> getTeamReviews(Long teamId) {
        Team team = getTeamOrThrow(teamId);

        return teamReviewRepository.findByTeamOrderByCreatedAtDesc(team).stream()
                .map(r -> new TeamReviewResponse(
                        r.getId(),
                        r.getReviewer().getUsername(),
                        r.getReviewer().getCurrentRank() != null ? r.getReviewer().getCurrentRank() : "Unranked",
                        r.isRecommended(),
                        r.getComment(),
                        r.getCreatedAt().toLocalDate()
                ))
                .collect(Collectors.toList());
    }

    public void addReview(Long teamId, CreateReviewRequest request, String username) {
        Team team = getTeamOrThrow(teamId);
        User reviewer = userService.getByUsername(username);

        boolean isMember = teamMemberRepository.existsByTeamAndUser(team, reviewer);
        boolean isOwner = team.getOwnerId().equals(reviewer.getId());

        if (isOwner || isMember) {
            throw new IllegalArgumentException("You cannot review your own team");
        }

        if (teamReviewRepository.existsByTeamAndReviewer(team, reviewer)) {
            throw new IllegalArgumentException("You have already reviewed this team");
        }

        TeamReview review = new TeamReview();
        review.setTeam(team);
        review.setReviewer(reviewer);
        review.setRecommended(request.isRecommended());
        review.setComment(request.comment());

        teamReviewRepository.save(review);
    }

    @Transactional(readOnly = true)
    public List<MatchHistoryResponse> getMatchHistory(Long teamId) {
        Team team = getTeamOrThrow(teamId);

        List<ScrimMatch> matches = matchRepository.findByTeamHomeIdOrTeamAwayId(teamId, teamId);

        return matches.stream()
                .filter(m -> m.getStatus() == MatchStatus.COMPLETED)
                .map(m -> {
                    boolean isHomeTeam = m.getTeamHome() != null && m.getTeamHome().getId().equals(teamId);
                    Team opponent = isHomeTeam ? m.getTeamAway() : m.getTeamHome();

                    String opponentName = opponent != null ? opponent.getName() : "Unknown";
                    String opponentTag = opponent != null ? opponent.getTag() : "";
                    int opponentAvgTier = opponent != null && opponent.getAverageMmr() != null ? opponent.getAverageMmr() : 0;

                    int myScore = 0; // Replace with: isHomeTeam ? m.getHomeScore() : m.getAwayScore();
                    int oppScore = 0; // Replace with: isHomeTeam ? m.getAwayScore() : m.getHomeScore();

                    String result = myScore > oppScore ? "WIN" : (myScore < oppScore ? "LOSS" : "DRAW");

                    return new MatchHistoryResponse(
                            m.getId(),
                            opponentName,
                            opponentTag,
                            opponentAvgTier,
                            myScore,
                            oppScore,
                            result,
                            m.getMapName() != null ? m.getMapName() : "TBD",
                            m.getScheduledTime() != null ? m.getScheduledTime().toLocalDate() : null
                    );
                })
                .collect(Collectors.toList());
    }


    private Team getTeamOrThrow(Long id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found with ID: " + id));
    }
}