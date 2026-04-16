package com.valoscrim.backend.match.service;

import com.valoscrim.backend.common.enums.MatchSide;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class InMemoryMatchReadyManager implements MatchReadyManager {

    private final Map<Long, Set<Long>> soloReadyMap = new ConcurrentHashMap<>();

    private final Map<Long, Map<MatchSide, Boolean>> teamReadyMap = new ConcurrentHashMap<>();

    @Override
    public boolean toggleSoloReady(Long matchId, Long userId) {
        Set<Long> readyUsers = soloReadyMap.computeIfAbsent(matchId, k -> ConcurrentHashMap.newKeySet());
        if (readyUsers.contains(userId)) {
            readyUsers.remove(userId);
            return false;
        } else {
            readyUsers.add(userId);
            return true;
        }
    }

    @Override
    public void setSoloReady(Long matchId, Long userId, boolean isReady) {
        Set<Long> readyUsers = soloReadyMap.computeIfAbsent(matchId, k -> ConcurrentHashMap.newKeySet());
        if (isReady) readyUsers.add(userId);
        else readyUsers.remove(userId);
    }

    @Override
    public boolean isSoloReady(Long matchId, Long userId) {
        Set<Long> readyUsers = soloReadyMap.get(matchId);
        return readyUsers != null && readyUsers.contains(userId);
    }

    @Override
    public int getSoloReadyCount(Long matchId) {
        Set<Long> readyUsers = soloReadyMap.get(matchId);
        return readyUsers == null ? 0 : readyUsers.size();
    }

    @Override
    public boolean toggleTeamReady(Long matchId, MatchSide side) {
        Map<MatchSide, Boolean> matchReadyState = teamReadyMap.computeIfAbsent(matchId, k -> new ConcurrentHashMap<>());
        return matchReadyState.compute(side, (k, v) -> v == null ? true : !v);
    }

    @Override
    public void setTeamReady(Long matchId, MatchSide side, boolean isReady) {
        Map<MatchSide, Boolean> matchReadyState = teamReadyMap.computeIfAbsent(matchId, k -> new ConcurrentHashMap<>());
        matchReadyState.put(side, isReady);
    }

    @Override
    public boolean isTeamReady(Long matchId, MatchSide side) {
        Map<MatchSide, Boolean> matchReadyState = teamReadyMap.get(matchId);
        return matchReadyState != null && matchReadyState.getOrDefault(side, false);
    }

    @Override
    public void clearMatch(Long matchId) {
        soloReadyMap.remove(matchId);
        teamReadyMap.remove(matchId);
    }
}