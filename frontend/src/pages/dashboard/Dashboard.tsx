import { useEffect, useState } from 'react';
import { api } from '../../api/axios';
import { MatchCard, type MatchData } from '../../matches/MatchCard.tsx';
import { Loader2, Swords, Crosshair } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Toast, type ToastType } from "../../UI/Toast.tsx";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [myMatches, setMyMatches] = useState<MatchData[]>([]);
    const [availableMatches, setAvailableMatches] = useState<MatchData[]>([]);
    const [loading, setLoading] = useState(true);

    const [toast, setToast] = useState<{msg: string, type: ToastType} | null>(null);

    const showToast = (msg: string, type: ToastType) => {
        setToast({ msg, type });
    }

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/matches?strategy=CLOSEST_RANK`);
            const allMatches: MatchData[] = Array.isArray(response.data) ? response.data : [];

            const participating = allMatches.filter(m => m.isParticipating === true);
            const others = allMatches.filter(m => m.isParticipating !== true);

            setMyMatches(participating);
            setAvailableMatches(others);
        } catch (error) {
            console.error("Failed to fetch matches", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches();

        const handleMatchUpdate = () => fetchMatches();
        window.addEventListener('match-created', handleMatchUpdate);
        return () => window.removeEventListener('match-created', handleMatchUpdate);
    }, []);

    const handleJoin = async (match: MatchData) => {
        if (match.matchType === 'SOLO') {
            try {
                await api.post(`/matches/${match.id}/join-solo`);
                showToast("Joined Solo lobby.", 'success');
                navigate(`/match/${match.id}`);
            } catch (err: any) {
                showToast(err.response?.data?.message || "Failed to Join lobby", 'error');
            }
        } else {
            if (!user?.teams || user.teams.length === 0) {
                showToast("You need to own a team to join a Team Scrim.", 'error');
                return;
            }

            const myTeamId = user.teams[0].id;

            try {
                await api.post(`/matches/${match.id}/join?teamId=${myTeamId}`);
                showToast("You joined the team Successfully.", 'success');
                navigate(`/match/${match.id}`);
            } catch (err: any) {
                showToast(err.response?.data?.message || "Failed to join match", 'error');
            }
        }
    };

    const handleLeave = async (matchId: number) => {
        if (!window.confirm("Are you sure you want to leave this match?")) return;

        try {
            await api.post(`/matches/${matchId}/leave`);
            showToast("Successfully left the match.", 'success');
            fetchMatches();
        } catch (err: any) {
            showToast(err.response?.data?.message || "Failed to leave match", 'error');
        }
    };

    return (
        <div className="space-y-8 pb-20 max-w-5xl mx-auto">
            { toast && (
                <Toast
                    message={toast.msg}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-10 w-10 text-[#ff4655] animate-spin" />
                </div>
            ) : (
                <>
                    {myMatches.length > 0 && (
                        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-green-500/10 border-l-4 border-green-500 p-4 mb-6 flex items-center gap-3 rounded-r-lg">
                                <Crosshair className="text-green-400" size={24} />
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">Your Active Lobbies</h2>
                                    <p className="text-sm text-gray-400">Matches you are currently participating in.</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {myMatches.map((match) => (
                                    <MatchCard
                                        key={`my-${match.id}`}
                                        match={match}
                                        onJoin={handleJoin}
                                        onView={(id) => navigate(`/match/${id}`)}
                                        onLeave={handleLeave}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="bg-[#1f2937]/50 backdrop-blur-sm sticky top-16 z-10 p-4 -mx-4 mb-6 border-b border-gray-700/50 flex items-center gap-2">
                            <Swords className="text-[#ff4655]" />
                            <h1 className="text-xl font-bold text-white tracking-tight">Available Scrims</h1>
                        </div>

                        <div className="space-y-3">
                            {availableMatches.length > 0 ? (
                                availableMatches.map((match) => (
                                    <MatchCard
                                        key={match.id}
                                        match={match}
                                        onJoin={handleJoin}
                                        onView={(id) => navigate(`/match/${id}`)}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-10 border-2 border-dashed border-gray-700 rounded-xl bg-[#1f2937]/30">
                                    <p className="text-gray-500">No open scrims found right now.</p>
                                    <p className="text-gray-600 text-sm mt-2">Create a new match to get started!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}