import React from 'react';
import { Swords, User, Clock, MapPinned } from 'lucide-react';
import { getRankFromElo } from '../utils/rankUtils';

export interface MatchData {
    id: number;
    matchType: 'TEAM' | 'SOLO';
    status: string;
    scheduledTime: string;
    serverLocation?: string;

    homeTeamId?: number;
    homeTeamName?: string;
    homeTeamAverageMmr?: number;

    awayTeamId?: number;
    awayTeamName?: string;
    awayTeamAverageMmr?: number;

    playerCount?: number;
    maxPlayers?: number;
}

interface MatchCardProps {
    match: MatchData;
    onJoin: (match: MatchData) => void;
    onView: (matchId: number) => void;
}

const formatRegion = (region?: string) => {
    if (!region) return 'Unknown Region';
    const regions: Record<string, string> = {
        'SEOUL': 'Seoul',
        'TOKYO': 'Tokyo',
        'SINGAPORE': 'Singapore',
        'MUMBAI': 'Mumbai',
        'SYDNEY': 'Sydney',
        'FRANKFURT': 'Frankfurt',
        'LONDON': 'London',
        'N_CALIFORNIA': 'N. California',
        'TEXAS': 'Texas',
        'OREGON': 'Oregon'
    };
    return regions[region] || region;
};

export const MatchCard: React.FC<MatchCardProps> = ({ match, onJoin, onView }) => {

    const handleJoinClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onJoin(match);
    }

    if (match.matchType === 'SOLO') {
        const filled = match.playerCount || 0;
        const max = 10;
        const percentage = Math.min((filled / max) * 100, 100);
        const isFull = filled >= max;

        const soloRank = getRankFromElo(match.homeTeamAverageMmr);

        return (
            <div
                onClick={() => onView(match.id)}
                className="bg-[#1f2937] border border-gray-700 hover:border-blue-500 rounded-lg p-5 mb-4 transition-all group relative overflow-hidden shadow-lg cursor-pointer">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 group-hover:bg-blue-400 transition-colors" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500/20 p-2.5 rounded-lg text-blue-400 border border-blue-500/20">
                            <User size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg leading-tight">Solo Queue</h3>
                            <div className="text-gray-400 text-xs flex items-center gap-2 mt-1">
                                <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {new Date(match.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                <span className="text-gray-600">•</span>
                                <span className="flex items-center gap-1 text-blue-300/80">
                                    <MapPinned size={12} />
                                    {formatRegion(match.serverLocation)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-start md:self-center">
                        {match.homeTeamAverageMmr && match.homeTeamAverageMmr > 0 && (
                            <span className={`${soloRank.bg} ${soloRank.color} border border-current px-2 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5`}>
                                <img src={soloRank.iconUrl} alt={soloRank.name} className="w-4 h-4 object-contain drop-shadow-md" />
                                Avg: {soloRank.name}
                            </span>
                        )}
                        <span className="bg-[#0f1923] text-gray-300 px-3 py-1 rounded text-xs font-mono border border-gray-600">
                            {match.status}
                        </span>
                    </div>
                </div>

                <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1 font-mono uppercase">
                        <span>Players Joined</span>
                        <span className={isFull ? 'text-red-500' : 'text-blue-400'}>{filled} / {max}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 relative overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>

                <button
                    onClick={handleJoinClick}
                    disabled={isFull}
                    className={`w-full font-bold py-3 rounded transition-all text-sm uppercase tracking-wider ${
                        isFull
                            ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                    }`}
                >
                    {isFull ? 'Lobby Full' : 'Join Solo Queue'}
                </button>
            </div>
        );
    }

    const rankA = getRankFromElo(match.homeTeamAverageMmr);
    const rankB = match.awayTeamAverageMmr ? getRankFromElo(match.awayTeamAverageMmr) : null;

    return (
        <div
            onClick={() => onView(match.id)}
            className="group relative bg-[#1f2937] border border-gray-700 hover:border-[#ff4655] transition-all duration-300 rounded-lg p-4 mb-4 overflow-hidden shadow-lg cursor-pointer">
            <div className="absolute inset-y-0 left-0 w-1 bg-[#ff4655] transition-colors" />

            <div className="flex flex-col md:flex-row items-center justify-between gap-6">

                <div className="flex-1 flex items-center gap-4 w-full">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center border ${rankA.bg} border-gray-600 shrink-0 bg-[#0f1923] p-1.5`}>
                        <img src={rankA.iconUrl} alt={rankA.name} className="w-full h-full object-contain drop-shadow-lg" />
                    </div>
                    <div className="overflow-hidden">
                        <h3 className="text-white font-bold text-lg truncate">{match.homeTeamName || "Unknown"}</h3>
                        <div className={`text-xs font-bold uppercase tracking-wider ${rankA.color}`}>
                            {rankA.name}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center shrink-0 px-2">
                    <div className="bg-[#0f1923] p-2 rounded-full border border-gray-600 group-hover:border-[#ff4655] transition-colors mb-2">
                        <Swords size={20} className="text-gray-400 group-hover:text-[#ff4655]" />
                    </div>
                    <div className="flex flex-col items-center gap-1.5 text-center">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 font-mono bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">BO1</span>
                            {match.serverLocation && (
                                <span className="flex items-center gap-1 text-[10px] text-[#ff4655] font-bold tracking-wider bg-[#ff4655]/10 px-1.5 py-0.5 rounded border border-[#ff4655]/20">
                                    <MapPinned size={10} /> {formatRegion(match.serverLocation)}
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(match.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-end gap-4 w-full text-right">
                    {match.awayTeamName ? (
                        <>
                            <div className="overflow-hidden">
                                <h3 className="text-white font-bold text-lg truncate">{match.awayTeamName}</h3>
                                <div className={`text-xs font-bold uppercase tracking-wider ${rankB?.color}`}>
                                    {rankB?.name}
                                </div>
                            </div>
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center border ${rankB?.bg} border-gray-600 shrink-0 bg-[#0f1923] p-1.5`}>
                                <img src={rankB?.iconUrl} alt={rankB?.name} className="w-full h-full object-contain drop-shadow-lg" />
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <div className="text-gray-400 font-medium text-sm">Open Slot</div>
                                <div className="text-xs text-gray-600">Waiting for opponent...</div>
                            </div>
                            <button
                                onClick={handleJoinClick}
                                className="bg-[#ff4655] hover:bg-[#ff4655]/90 text-white font-bold py-2 px-6 rounded-md transition-transform active:scale-95 shadow-lg shadow-red-900/20 whitespace-nowrap"
                            >
                                JOIN
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};