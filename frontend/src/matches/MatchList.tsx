import { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { api } from "../api/axios.ts";
import { MatchCard } from './MatchCard';
import type { MatchData } from './MatchCard';
import { useAuth } from "../context/AuthContext.tsx";
import {
    Loader2,
    Search,
    RefreshCw,
    ShieldAlert,
    Filter,
    MapPinned,
    Trophy,
    Swords,
    Activity
} from 'lucide-react';
import { Toast, type ToastType } from "../UI/Toast.tsx";
import { Select } from '../UI/Select';

type MatchTypeFilter = 'TEAM' | 'SOLO' | '';
type MatchStatusFilter = 'OPEN' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | '';
type ServerRegionFilter = '' | 'SEOUL' | 'TOKYO' | 'SINGAPORE' | 'MUMBAI' | 'SYDNEY' | 'FRANKFURT' | 'LONDON' | 'N_CALIFORNIA' | 'TEXAS' | 'OREGON';
type AverageRankFilter =
    | ''
    | 'IRON'
    | 'BRONZE'
    | 'SILVER'
    | 'GOLD'
    | 'PLATINUM'
    | 'DIAMOND'
    | 'ASCENDANT'
    | 'IMMORTAL'
    | 'RADIANT';

export default function MatchList() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [matches, setMatches] = useState<MatchData[]>([]);
    const [loading, setLoading] = useState(true);

    const [strategy, setStrategy] = useState('CLOSEST_RANK');
    const [matchType, setMatchType] = useState<MatchTypeFilter>('');
    const [status, setStatus] = useState<MatchStatusFilter>('OPEN');
    const [serverLocation, setServerLocation] = useState<ServerRegionFilter>('');
    const [averageRank, setAverageRank] = useState<AverageRankFilter>('');

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

    const showToast = (msg: string, type: ToastType) => {
        setToast({ msg, type });
    };

    const sortOptions = [
        { value: 'CLOSEST_RANK', label: 'Skill Match' },
        { value: 'TIME_CREATED', label: 'Newest' },
        { value: 'RANK_ASC', label: 'Lowest MMR' },
        { value: 'RANK_DESC', label: 'Highest MMR' }
    ];

    const matchTypeOptions = [
        { value: '', label: 'All Types' },
        { value: 'TEAM', label: 'Team' },
        { value: 'SOLO', label: 'Solo' }
    ];

    const statusOptions = [
        { value: '', label: 'All Statuses' },
        { value: 'OPEN', label: 'Open' },
        { value: 'SCHEDULED', label: 'Scheduled' },
        { value: 'IN_PROGRESS', label: 'In Progress' },
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'CANCELLED', label: 'Cancelled' }
    ];

    const rankOptions = [
        { value: '', label: 'All Ranks' },
        { value: 'IRON', label: 'Iron' },
        { value: 'BRONZE', label: 'Bronze' },
        { value: 'SILVER', label: 'Silver' },
        { value: 'GOLD', label: 'Gold' },
        { value: 'PLATINUM', label: 'Platinum' },
        { value: 'DIAMOND', label: 'Diamond' },
        { value: 'ASCENDANT', label: 'Ascendant' },
        { value: 'IMMORTAL', label: 'Immortal' },
        { value: 'RADIANT', label: 'Radiant' }
    ];

    const regionOptions = [
        { value: '', label: 'All Regions' },
        { value: 'SEOUL', label: 'Korea / Seoul' },
        { value: 'TOKYO', label: 'Japan / Tokyo' },
        { value: 'SINGAPORE', label: 'Singapore' },
        { value: 'MUMBAI', label: 'India / Mumbai' },
        { value: 'SYDNEY', label: 'Australia / Sydney' },
        { value: 'FRANKFURT', label: 'Germany / Frankfurt' },
        { value: 'LONDON', label: 'UK / London' },
        { value: 'N_CALIFORNIA', label: 'NA / N. California' },
        { value: 'TEXAS', label: 'NA / Texas' },
        { value: 'OREGON', label: 'NA / Oregon' }
    ];

    useEffect(() => {
        const handleMatchCreated = () => setRefreshTrigger(prev => prev + 1);

        window.addEventListener('match-created', handleMatchCreated);
        return () => window.removeEventListener('match-created', handleMatchCreated);
    }, []);

    useEffect(() => {
        fetchMatches();
    }, [strategy, matchType, status, serverLocation, averageRank, refreshTrigger]);


    const fetchMatches = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();

            if (strategy) params.set('strategy', strategy);
            if (matchType) params.set('matchType', matchType);
            if (status) params.set('status', status);
            if (serverLocation) params.set('serverLocation', serverLocation);
            if (averageRank) params.set('averageRank', averageRank);

            const res = await api.get(`/matches?${params.toString()}`);
            setMatches(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch matches", error);
            showToast("Failed to load matches.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleJoinMatch = async (match: MatchData) => {
        if (match.matchType === 'SOLO') {
            try {
                await api.post(`/matches/${match.id}/join-solo`);
                showToast("Successfully joined Solo Queue.", 'success');
                navigate(`/match/${match.id}`);
            } catch (err: any) {
                showToast(err.response?.data?.message || "Failed to join lobby", 'error');
            }
            return;
        }

        if (!user?.teams || user.teams.length === 0) {
            showToast("You need to own a team to join a team scrim.", 'error');
            return;
        }

        const myTeamId = user.teams[0].id;

        try {
            await api.post(`/matches/${match.id}/join?teamId=${myTeamId}`);
            showToast("Team joined successfully!", 'success');
            navigate(`/match/${match.id}`);
        } catch (err: any) {
            showToast(err.response?.data?.message || "Failed to join match", 'error');
        }
    };

    const clearFilters = () => {
        setStrategy('CLOSEST_RANK');
        setMatchType('');
        setStatus('OPEN');
        setServerLocation('');
        setAverageRank('');
    };

    if (loading) {
        return (
            <div className="flex justify-center p-20">
                <Loader2 className="animate-spin text-[#ff4655]" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-8 pb-24">
            {toast && (
                <Toast
                    message={toast.msg}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                        <Search className="text-[#ff4655]" /> Match Finder
                    </h1>
                    <p className="text-gray-400">Search scrims with structured filters.</p>
                </div>

                <button
                    onClick={fetchMatches}
                    className="flex items-center gap-2 px-4 py-2 bg-[#1f2937] border border-gray-700 hover:border-[#ff4655] rounded-lg text-gray-300 hover:text-white transition-colors"
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            <div className="bg-[#1f2937]/70 border border-gray-700 rounded-2xl p-4 mb-8">
                <div className="flex items-center gap-2 mb-4 text-gray-300">
                    <Filter size={16} className="text-[#ff4655]" />
                    <span className="font-bold text-sm uppercase tracking-wider">Filters</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                    <Select
                        options={matchTypeOptions}
                        value={matchType}
                        onChange={setMatchType}
                        placeholder="Match Type"
                        icon={<Swords size={16} />}
                    />

                    <Select
                        options={statusOptions}
                        value={status}
                        onChange={setStatus}
                        placeholder="Lobby Status"
                        icon={<Activity size={16} />}
                    />

                    <Select
                        options={rankOptions}
                        value={averageRank}
                        onChange={setAverageRank}
                        placeholder="Average Rank"
                        icon={<Trophy size={16} />}
                    />

                    <Select
                        options={regionOptions}
                        value={serverLocation}
                        onChange={setServerLocation}
                        placeholder="Server Region"
                        icon={<MapPinned size={16} />}
                    />

                    <Select
                        options={sortOptions}
                        value={strategy}
                        onChange={setStrategy}
                        placeholder="Sort"
                        icon={<Filter size={16} />}
                    />
                </div>

                <div className="flex justify-end mt-4">
                    <button
                        onClick={clearFilters}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Clear filters
                    </button>
                </div>
            </div>

            <div className="bg-[#1f2937]/50 border border-gray-700 rounded-xl p-4 mb-8 flex items-center gap-3 text-gray-300 text-sm">
                <ShieldAlert size={18} className="text-[#ff4655]" />
                <span>
                    Team scrims require a team owner to join. Solo lobbies allow individual entry.
                </span>
            </div>

            <div className="space-y-4">
                {matches.length > 0 ? (
                    matches.map((match) => (
                        <MatchCard
                            key={match.id}
                            match={match}
                            onJoin={() => handleJoinMatch(match)}
                            onView={(id) => navigate(`/match/${id}`)}
                        />
                    ))
                ) : (
                    <div className="text-center py-20 border-2 border-dashed border-gray-700 rounded-xl bg-[#1f2937]/30">
                        <p className="text-gray-500 text-lg">No lobbies found.</p>
                        <p className="text-gray-600 text-sm mt-2">
                            Try widening your rank, region, or status filters.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}