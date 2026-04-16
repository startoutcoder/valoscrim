package com.valoscrim.backend.match.service;

import com.valoscrim.backend.common.enums.MatchSide;

public interface MatchReadyManager {
    boolean toggleSoloReady(Long matchId, Long userId);
    void setSoloReady(Long matchId, Long userId, boolean isReady);
    boolean isSoloReady(Long matchId, Long userId);
    int getSoloReadyCount(Long matchId);

    boolean toggleTeamReady(Long matchId, MatchSide side);
    void setTeamReady(Long matchId, MatchSide side, boolean isReady);
    boolean isTeamReady(Long matchId, MatchSide side);

    void clearMatch(Long matchId);
}