export interface RankInfo {
    name: string;
    color: string;
    bg: string;
    border: string;
    iconUrl: string;
}

const BASE_URL =
    "https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04";

export function getRankFromElo(elo?: number): RankInfo {
    if (elo === undefined || elo === null || elo <= 0) {
        return {
            name: "Unranked",
            color: "text-gray-400",
            bg: "bg-gray-600/10",
            border: "border-gray-600/30",
            iconUrl: `${BASE_URL}/0/smallicon.png`
        };
    }

    if (elo >= 2400) {
        return {
            name: "Radiant",
            color: "text-yellow-400",
            bg: "bg-yellow-400/10",
            border: "border-yellow-400/30",
            iconUrl: `${BASE_URL}/27/smallicon.png`
        };
    }
    if (elo >= 2100) {
        return {
            name: "Immortal",
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            border: "border-rose-500/30",
            iconUrl: `${BASE_URL}/24/smallicon.png`
        };
    }
    if (elo >= 1800) {
        return {
            name: "Ascendant",
            color: "text-emerald-400",
            bg: "bg-emerald-400/10",
            border: "border-emerald-400/30",
            iconUrl: `${BASE_URL}/21/smallicon.png`
        };
    }
    if (elo >= 1500) {
        return {
            name: "Diamond",
            color: "text-purple-400",
            bg: "bg-purple-400/10",
            border: "border-purple-400/30",
            iconUrl: `${BASE_URL}/18/smallicon.png`
        };
    }
    if (elo >= 1200) {
        return {
            name: "Platinum",
            color: "text-cyan-400",
            bg: "bg-cyan-400/10",
            border: "border-cyan-400/30",
            iconUrl: `${BASE_URL}/15/smallicon.png`
        };
    }
    if (elo >= 900) {
        return {
            name: "Gold",
            color: "text-yellow-500",
            bg: "bg-yellow-500/10",
            border: "border-yellow-500/30",
            iconUrl: `${BASE_URL}/12/smallicon.png`
        };
    }
    if (elo >= 600) {
        return {
            name: "Silver",
            color: "text-gray-300",
            bg: "bg-gray-300/10",
            border: "border-gray-300/30",
            iconUrl: `${BASE_URL}/9/smallicon.png`
        };
    }
    if (elo >= 300) {
        return {
            name: "Bronze",
            color: "text-amber-700",
            bg: "bg-amber-700/10",
            border: "border-amber-700/30",
            iconUrl: `${BASE_URL}/6/smallicon.png`
        };
    }

    return {
        name: "Iron",
        color: "text-gray-500",
        bg: "bg-gray-500/10",
        border: "border-gray-500/30",
        iconUrl: `${BASE_URL}/3/smallicon.png`
    };
}

export const getRankInfoFromString = (rankString?: string) => {
    if (!rankString) return null;

    const r = rankString.toLowerCase();

    if (r.includes("radiant")) {
        return {
            bg: "bg-yellow-400/10",
            color: "text-yellow-400",
            border: "border-yellow-400/30",
            icon: `${BASE_URL}/27/smallicon.png`
        };
    }
    if (r.includes("immortal")) {
        return {
            bg: "bg-rose-500/10",
            color: "text-rose-500",
            border: "border-rose-500/30",
            icon: `${BASE_URL}/24/smallicon.png`
        };
    }
    if (r.includes("ascendant")) {
        return {
            bg: "bg-emerald-400/10",
            color: "text-emerald-400",
            border: "border-emerald-400/30",
            icon: `${BASE_URL}/21/smallicon.png`
        };
    }
    if (r.includes("diamond")) {
        return {
            bg: "bg-purple-400/10",
            color: "text-purple-400",
            border: "border-purple-400/30",
            icon: `${BASE_URL}/18/smallicon.png`
        };
    }
    if (r.includes("platinum")) {
        return {
            bg: "bg-cyan-400/10",
            color: "text-cyan-400",
            border: "border-cyan-400/30",
            icon: `${BASE_URL}/15/smallicon.png`
        };
    }
    if (r.includes("gold")) {
        return {
            bg: "bg-yellow-500/10",
            color: "text-yellow-500",
            border: "border-yellow-500/30",
            icon: `${BASE_URL}/12/smallicon.png`
        };
    }
    if (r.includes("silver")) {
        return {
            bg: "bg-gray-300/10",
            color: "text-gray-300",
            border: "border-gray-300/30",
            icon: `${BASE_URL}/9/smallicon.png`
        };
    }
    if (r.includes("bronze")) {
        return {
            bg: "bg-amber-700/10",
            color: "text-amber-600",
            border: "border-amber-700/30",
            icon: `${BASE_URL}/6/smallicon.png`
        };
    }
    if (r.includes("iron")) {
        return {
            bg: "bg-gray-500/10",
            color: "text-gray-500",
            border: "border-gray-500/30",
            icon: `${BASE_URL}/3/smallicon.png`
        };
    }

    return {
        bg: "bg-gray-600/10",
        color: "text-gray-400",
        border: "border-gray-600/30",
        icon: `${BASE_URL}/0/smallicon.png`
    };
};