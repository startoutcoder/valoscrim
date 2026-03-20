package com.valoscrim.backend.common.util;

public final class RankUtil {

    private RankUtil() {
    }

    public static String rankFromMmr(Integer mmr) {
        if (mmr == null || mmr <= 0) {
            return "Unranked";
        }
        if (mmr >= 2400) return "Radiant";
        if (mmr >= 2100) return "Immortal";
        if (mmr >= 1800) return "Ascendant";
        if (mmr >= 1500) return "Diamond";
        if (mmr >= 1200) return "Platinum";
        if (mmr >= 900) return "Gold";
        if (mmr >= 600) return "Silver";
        if (mmr >= 300) return "Bronze";
        return "Iron";
    }
}