import { useEffect, useState } from 'react';
import { api } from '../api/axios.ts';
import { Trophy, Map } from 'lucide-react';
import { getRankFromElo } from '../utils/rankUtils.ts';

interface MatchHistory {
    id: number;
    opponentName: string;
    opponentTag: string;
    opponentAvgTier: number;
    myScore: number;
    opponentScore: number;
    result: 'WIN' | 'LOSS' | 'DRAW';
    mapName: string;
    date: string;
}

export const RecentMatches = ({ teamId }: { teamId: string }) => {
    const [matches, setMatches] = useState<MatchHistory[]>([]);

    useEffect(() => {
        if (teamId) {
            api.get(`/teams/${teamId}/matches`)
                .then(res => setMatches(res.data))
                .catch(console.error);
        }
    }, [teamId]);

    if (matches.length === 0) return null;

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Trophy className="text-[#ff4655]" /> Recent Matches
            </h2>
            <div className="space-y-2">
                {matches.map((match) => {
                    const isWin = match.result === 'WIN';
                    const oppRank = getRankFromElo(match.opponentAvgTier);

                    return (
                        <div key={match.id} className="bg-[#1f2937] border border-gray-700 rounded-lg p-3 flex items-center justify-between">

                            <div className={`w-1 h-12 rounded-full ${isWin ? 'bg-green-500' : 'bg-red-500'}`} />

                            <div className="flex flex-col items-center w-16">
                                <span className={`text-xl font-black ${isWin ? 'text-green-500' : 'text-red-500'}`}>
                                    {isWin ? 'W' : 'L'}
                                </span>
                                <span className="text-xs text-gray-400 font-mono">{match.myScore} - {match.opponentScore}</span>
                            </div>

                            <div className="flex-1 px-4 border-l border-gray-700 ml-4">
                                <div className="text-xs text-gray-500 uppercase font-bold">VS</div>
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-bold">{match.opponentName}</span>
                                    <span className={`text-[10px] px-1 rounded bg-[#0f1923] border border-gray-600 ${oppRank.color}`}>
                                        {oppRank.name}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-gray-400 text-sm">
                                <Map size={14} />
                                <span>{match.mapName}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};