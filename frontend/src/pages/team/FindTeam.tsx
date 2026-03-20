import { useEffect, useState } from 'react';
import { api } from '../../api/axios';
import { Search, Users, Shield, Loader2, Send, Mic, ChevronLeft, ChevronRight } from 'lucide-react';
import { Toast, type ToastType } from '../../UI/Toast.tsx';

interface PublicTeam {
    id: number;
    name: string;
    tag: string;
    memberCount: number;
    recruiting: boolean;
    averageRank: string;
    micAvailable?: boolean;
    minimumAge?: number;
}

export default function FindTeam() {
    const [teams, setTeams] = useState<PublicTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [toast, setToast] = useState<{msg: string, type: ToastType} | null>(null);

    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const showToast = (msg: string, type: ToastType) => setToast({ msg, type });

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(0);
            fetchTeams();
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        fetchTeams();
    }, [page]);

    const fetchTeams = async () => {
        setLoading(true);
        try {
            if (searchQuery.trim() === '') {
                const res = await api.get(`/teams/public?page=${page}&size=9`);

                const mappedTeams: PublicTeam[] = (res.data.content || []).map((t: any) => ({
                    id: t.id,
                    name: t.name,
                    tag: t.tag,
                    memberCount: t.memberCount ?? 0,
                    recruiting: t.recruiting ?? ((t.memberCount ?? 0) < 7),
                    averageRank: t.averageRank ?? 'Unranked',
                    micAvailable: t.micAvailable,
                    minimumAge: t.minimumAge
                }));

                setTeams(mappedTeams);
                setTotalPages(res.data.totalPages || 1);
            } else {
                const res = await api.get(`/teams/search?query=${searchQuery}`);

                const mappedTeams: PublicTeam[] = res.data.map((t: any) => ({
                    id: t.id,
                    name: t.name,
                    tag: t.tag,
                    memberCount: t.memberCount ?? t.members?.length ?? 0,
                    recruiting: (t.memberCount ?? t.members?.length ?? 0) < 7,
                    averageRank: t.averageRank ?? 'Unranked',
                    micAvailable: t.teamPreferences?.requireMic,
                    minimumAge: t.teamPreferences?.minimumAge
                }));

                setTeams(mappedTeams);
                setTotalPages(1);
            }
        } catch (error) {
            console.error("Failed to fetch teams", error);
            showToast("Failed to load teams.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleRequestJoin = async (teamId: number) => {
        try {
            await api.post(`/teams/${teamId}/join-request`);
            showToast("Request sent to team captain!", 'success');
        } catch (err: any) {
            showToast(err.response?.data?.message || "Failed to send request", 'error');
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                        <Search className="text-[#ff4655]" /> Find a Team
                    </h1>
                    <p className="text-gray-400">Browse organizations looking for players.</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search by Name or Tag..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#1f2937] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-[#ff4655] outline-none transition-colors"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-20"><Loader2 className="animate-spin text-[#ff4655]" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teams.map((team) => (
                            <div key={team.id} className="bg-[#1f2937] border border-gray-700 hover:border-gray-500 rounded-xl p-6 transition-all group hover:-translate-y-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="h-14 w-14 bg-gradient-to-br from-gray-800 to-black rounded-lg flex items-center justify-center border border-gray-600 shadow-lg">
                                            <span className="text-xl font-black text-white">{team.tag}</span>
                                        </div>
                                        <span className="text-xs font-mono text-gray-400 border border-gray-700 px-2 py-1 rounded bg-[#0f1923]">
                                            {team.averageRank || "UNRANKED"}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-1 truncate">{team.name}</h3>

                                    <div className="flex items-center gap-2 mb-4 text-xs font-medium">
                                        {team.micAvailable && (
                                            <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded flex items-center gap-1 border border-green-500/20">
                                                <Mic size={10} /> Mic
                                            </span>
                                        )}
                                        {team.minimumAge && (
                                            <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                                                {team.minimumAge}+ Age
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between text-sm text-gray-400 mb-6 border-t border-gray-700 pt-4">
                                        <span className="flex items-center gap-1"><Users size={14} /> {team.memberCount}/7 Members</span>
                                        {team.recruiting && <span className="text-[#ff4655] font-bold flex items-center gap-1"><Shield size={14} /> Recruiting</span>}
                                    </div>

                                    <button
                                        onClick={() => handleRequestJoin(team.id)}
                                        className="w-full bg-[#ff4655]/10 hover:bg-[#ff4655] text-[#ff4655] hover:text-white border border-[#ff4655]/50 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        <Send size={16} /> Request to Join
                                    </button>
                                </div>
                            </div>
                        ))}

                        {teams.length === 0 && (
                            <div className="col-span-full text-center py-20 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                                No teams found {searchQuery ? `matching "${searchQuery}"` : "currently recruiting."}
                            </div>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-12">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="p-2 bg-[#1f2937] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="text-gray-400 font-mono text-sm">
                                Page {page + 1} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="p-2 bg-[#1f2937] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}