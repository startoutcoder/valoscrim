package com.valoscrim.backend.match.service;

import com.valoscrim.backend.common.enums.MatchStatus;
import com.valoscrim.backend.common.util.RankUtil;
import com.valoscrim.backend.match.MatchRepository;
import com.valoscrim.backend.match.ScrimMatch;
import com.valoscrim.backend.match.dto.MatchFilterRequest;
import com.valoscrim.backend.match.dto.MatchResponse;
import com.valoscrim.backend.match.mapper.MatchMapper;
import com.valoscrim.backend.team.Team;
import com.valoscrim.backend.user.User;
import com.valoscrim.backend.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MatchSearchService {

    private final MatchRepository matchRepository;
    private final UserService userService;
    private final MatchMapper matchMapper;

    public List<MatchResponse> getOpenLobbies() {
        return matchRepository.findByStatusOrderByScheduledTimeAsc(MatchStatus.OPEN).stream()
                .map(matchMapper::toMatchResponse)
                .toList();
    }

    public List<MatchResponse> findMatches(MatchFilterRequest filter, String username) {
        String strategy = filter.strategy() == null ? "ALL" : filter.strategy().trim().toUpperCase();
        MatchStatus status = filter.status() != null ? filter.status() : MatchStatus.OPEN;

        List<ScrimMatch> matches = switch (strategy) {
            case "CLOSEST_RANK" -> findClosestRankMatches(username, status);
            case "TIME_CREATED" -> matchRepository.findByStatusOrderByCreatedAtDesc(status);
            case "RANK_ASC" -> matchRepository.findByStatusOrderByAverageMmrAsc(status);
            case "RANK_DESC" -> matchRepository.findByStatusOrderByAverageMmrDesc(status);
            default -> matchRepository.findByStatusOrderByScheduledTimeAsc(status);
        };

        Stream<ScrimMatch> stream = matches.stream();

        if (filter.matchType() != null) {
            stream = stream.filter(match -> match.getMatchType() == filter.matchType());
        }

        if (filter.serverLocation() != null) {
            stream = stream.filter(match -> filter.serverLocation().equals(match.getServerLocation()));
        }

        if (filter.averageRank() != null && !filter.averageRank().isBlank()) {
            String normalizedRank = filter.averageRank().trim().toUpperCase();
            stream = stream.filter(match -> {
                String rank = RankUtil.rankFromMmr(match.getAverageMmr());
                return rank != null && rank.toUpperCase().equals(normalizedRank);
            });
        }

        return stream
                .map(matchMapper::toMatchResponse)
                .toList();
    }

    public ScrimMatch getMatchOrThrow(Long matchId) {
        return matchRepository.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));
    }

    private List<ScrimMatch> findClosestRankMatches(String username, MatchStatus status) {
        User user = userService.getByUsername(username);

        Team myTeam = user.getMemberships().stream()
                .map(m -> m.getTeam())
                .findFirst()
                .orElse(null);

        if (myTeam == null || myTeam.getAverageMmr() == null || myTeam.getAverageMmr() == 0) {
            return matchRepository.findByStatusOrderByScheduledTimeAsc(status);
        }

        return matchRepository.findByStatusOrderByClosestAverageMmr(
                status,
                myTeam.getAverageMmr()
        );
    }
}