package com.valoscrim.backend.match.service;

import com.valoscrim.backend.common.enums.LineupSlotStatus;
import com.valoscrim.backend.common.enums.MatchStatus;
import com.valoscrim.backend.common.enums.MatchType;
import com.valoscrim.backend.common.enums.ParticipantType;
import com.valoscrim.backend.common.enums.ServerRegion;
import com.valoscrim.backend.common.util.RankUtil;
import com.valoscrim.backend.match.MatchRepository;
import com.valoscrim.backend.match.ScrimMatch;
import com.valoscrim.backend.match.dto.MatchFilterRequest;
import com.valoscrim.backend.match.dto.MatchResponse;
import com.valoscrim.backend.match.mapper.MatchMapper;
import com.valoscrim.backend.team.Team;
import com.valoscrim.backend.user.User;
import com.valoscrim.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MatchSearchService {

    private final MatchRepository matchRepository;
    private final MatchMapper matchMapper;
    private final UserRepository userRepository;

    public List<MatchResponse> getOpenLobbies() {
        return matchRepository.findMatchesWithFilters(MatchStatus.OPEN, null, null).stream()
                .sorted(Comparator.comparing(ScrimMatch::getScheduledTime))
                .map(match -> matchMapper.toMatchResponse(match, null))
                .toList();
    }

    public List<MatchResponse> findMatches(MatchFilterRequest filter, String username) {
        String strategy = filter.strategy() == null ? "ALL" : filter.strategy().trim().toUpperCase();
        MatchStatus status = filter.status() != null ? filter.status() : MatchStatus.OPEN;
        MatchType matchType = filter.matchType();
        ServerRegion serverLocation = filter.serverLocation();

        List<ScrimMatch> matches = new ArrayList<>(matchRepository.findMatchesWithFilters(status, matchType, serverLocation));

        if (username != null && !username.equals("anonymousUser")) {
            List<ScrimMatch> myActiveMatches = matchRepository.findMyActiveMatchesWithDetails(username);

            Set<Long> existingIds = matches.stream().map(ScrimMatch::getId).collect(Collectors.toSet());

            for (ScrimMatch myMatch : myActiveMatches) {
                if (!existingIds.contains(myMatch.getId())) {
                    matches.add(myMatch);
                }
            }
        }

        sortMatchesByStrategy(matches, strategy, username);

        Stream<ScrimMatch> stream = matches.stream();

        if (filter.averageRank() != null && !filter.averageRank().isBlank()) {
            String normalizedRank = filter.averageRank().trim().toUpperCase();
            stream = stream.filter(match -> {
                double avg = calculateMatchAverageMmr(match);
                String rank = RankUtil.rankFromMmr((int) Math.round(avg));
                return rank != null && rank.toUpperCase().equals(normalizedRank);
            });
        }

        return stream
                .map(match -> matchMapper.toMatchResponse(match, username))
                .toList();
    }

    public ScrimMatch getMatchOrThrow(Long matchId) {
        return matchRepository.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found"));
    }

    private void sortMatchesByStrategy(List<ScrimMatch> matches, String strategy, String username) {
        switch (strategy) {
            case "CLOSEST_RANK" -> {
                double myTeamMmr = getMyTeamAverageMmr(username);
                if (myTeamMmr > 0) {
                    matches.sort(Comparator.comparingDouble(m -> Math.abs(calculateMatchAverageMmr(m) - myTeamMmr)));
                } else {
                    matches.sort(Comparator.comparing(ScrimMatch::getScheduledTime));
                }
            }
            case "TIME_CREATED" -> matches.sort(Comparator.comparing(ScrimMatch::getCreatedAt).reversed());
            case "RANK_ASC" -> matches.sort(Comparator.comparingDouble(this::calculateMatchAverageMmr));
            case "RANK_DESC" -> matches.sort(Comparator.comparingDouble(this::calculateMatchAverageMmr).reversed());
            default -> matches.sort(Comparator.comparing(ScrimMatch::getScheduledTime));
        }
    }

    private double calculateMatchAverageMmr(ScrimMatch match) {
        return match.getPlayers().stream()
                .filter(p -> p.getLineupSlotStatus() == LineupSlotStatus.STARTER || p.getParticipantType() == ParticipantType.SOLO)
                .filter(p -> p.getUser() != null && p.getUser().getMmrElo() != null)
                .mapToInt(p -> p.getUser().getMmrElo())
                .average()
                .orElse(0.0);
    }

    private double getMyTeamAverageMmr(String username) {
        User user = userRepository.findUserWithTeamAndMembers(username).orElse(null);

        if (user == null) return 0.0;

        Team myTeam = user.getMemberships().stream()
                .map(m -> m.getTeam())
                .findFirst()
                .orElse(null);

        if (myTeam == null) return 0.0;

        return myTeam.getMembers().stream()
                .filter(m -> m.getUser() != null && m.getUser().getMmrElo() != null)
                .mapToInt(m -> m.getUser().getMmrElo())
                .average()
                .orElse(0.0);
    }
}