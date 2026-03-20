import { useEffect, useState } from 'react';
import { api } from '../../api/axios';
import { MatchCard } from '../../matches/MatchCard.tsx';
import { Loader2, Swords } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Toast, type ToastType } from "../../UI/Toast.tsx";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);


    const [toast, setToast] = useState<{msg: string, type: ToastType} | null>(null);

    const showToast = (msg: string, type: ToastType) => {
        setToast({ msg, type });
    }

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/matches?strategy=CLOSEST_RANK`);
            setMatches(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Failed to fetch matches", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches();

        const handleMatchCreated = () => fetchMatches();
        window.addEventListener('match-created', handleMatchCreated);

        return () => window.removeEventListener('match-created', handleMatchCreated);
    }, []);

    const handleJoin = async (match: any) => {
        if (match.matchType === 'SOLO') {
            try {
                await api.post(`/matches/${match.id}/join-solo`);
                showToast("Joined Solo lobby.", 'success');
                fetchMatches();
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
                showToast("You joined the team Successfully.",'success');
                fetchMatches();
            } catch (err: any) {
                showToast(err.response?.data?.message || "Failed to join match", 'error');
            }
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

            <div className="bg-[#1f2937]/50 backdrop-blur-sm sticky top-16 z-10 p-4 -mx-4 mb-8 border-b border-gray-700/50 flex items-center gap-2">
                <Swords className="text-[#ff4655]" />
                <h1 className="text-xl font-bold text-white tracking-tight">Active Scrims</h1>
            </div>

            <div className="space-y-3">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-10 w-10 text-[#ff4655] animate-spin" />
                    </div>
                ) : matches.length > 0 ? (
                    matches.map((match) => (
                        <MatchCard key={match.id} match={match} onJoin={() => handleJoin(match)}
                        onView={(id) => navigate(`/match/${id}`)}/>
                    ))
                ) : (
                    <div className="text-center py-10">
                        <p className="text-gray-500">No active scrims found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}