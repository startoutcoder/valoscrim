import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/axios.ts';
import { Check, X, Shield, Plus, Search, Loader2, Users } from 'lucide-react';

interface TeamInvite {
    id: number;
    teamName: string;
    teamTag: string;
    inviterName: string;
}

interface MyTeam {
    id: number;
    name: string;
    tag: string;
    role: string;
    memberCount: number;
}

export default function TeamPage() {
    const [teams, setTeams] = useState<MyTeam[]>([]);
    const [invites, setInvites] = useState<TeamInvite[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTeamData();
    }, []);

    const fetchTeamData = async () => {
        setLoading(true);
        try {
            const [teamsResponse, invitesResponse] = await Promise.all([
                api.get('/users/me/teams'),
                api.get('/users/me/team-invites')
            ]);
            setTeams(teamsResponse.data || []);
            setInvites(invitesResponse.data || []);
        } catch (error) {
            console.error("Failed to load team data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInviteResponse = async (inviteId: number, accept: boolean) => {
        try {
            await api.post(`/users/me/team-invites/${inviteId}/respond?accept=${accept}`);
            if (accept) {
                fetchTeamData();
            } else {
                setInvites(prev => prev.filter(i => i.id !== inviteId));
            }
        } catch (error) {
            console.error("Failed to respond to invite", error);
            alert("Something went wrong while responding to invite.");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 text-[#ff4655] animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-24">

            {invites.length > 0 && (
                <div className="space-y-4 mb-8">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <MailIcon className="text-[#ff4655]" /> Pending Invites
                    </h2>
                    <div className="grid gap-4">
                        {invites.map((invite) => (
                            <div key={invite.id} className="bg-[#1f2937] border border-[#ff4655]/50 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between shadow-[0_0_15px_rgba(255,70,85,0.1)] gap-4">
                                <div className="flex items-center gap-4 w-full">
                                    <div className="h-12 w-12 bg-[#ff4655]/10 rounded-full flex items-center justify-center border border-[#ff4655]/30 shrink-0">
                                        <Shield className="text-[#ff4655]" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg">
                                            {invite.teamName} <span className="text-gray-500 text-sm">#{invite.teamTag}</span>
                                        </h3>
                                        <p className="text-gray-400 text-sm">Invited by <span className="text-white">{invite.inviterName}</span></p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <button
                                        onClick={() => handleInviteResponse(invite.id, true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white border border-green-500/50 rounded-md transition-all font-bold text-sm"
                                    >
                                        <Check size={16} /> Accept
                                    </button>
                                    <button
                                        onClick={() => handleInviteResponse(invite.id, false)}
                                        className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/50 rounded-md transition-all"
                                        title="Decline"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Shield className="text-[#ff4655]" /> My Teams
                    </h1>
                    <p className="text-gray-400 text-sm">Manage your squads and view rosters.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Link
                        to="/team/find"
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#1f2937] hover:bg-[#2a374a] text-gray-300 hover:text-white border border-gray-600 rounded-lg transition-all font-bold text-sm"
                    >
                        <Search size={16} />
                        Find Team
                    </Link>
                    <Link
                        to="/team/create"
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#ff4655] hover:bg-[#ff4655]/90 text-white rounded-lg transition-all font-bold text-sm shadow-lg shadow-red-900/20"
                    >
                        <Plus size={16} />
                        Create Team
                    </Link>
                </div>
            </div>

            {teams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teams.map((team) => (
                        <Link
                            to={`/team/${team.id}`}
                            key={team.id}
                            className="group relative bg-[#1f2937] border border-gray-700 hover:border-[#ff4655] p-6 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-transparent group-hover:bg-[#ff4655] transition-colors" />

                            <div className="flex items-start justify-between mb-4">
                                <div className="h-16 w-16 bg-gradient-to-br from-gray-800 to-black rounded-xl flex items-center justify-center border border-gray-600 group-hover:border-[#ff4655]/50 transition-colors shadow-lg">
                                    <span className="text-2xl font-black text-white tracking-wider">{team.tag}</span>
                                </div>
                                <span className="bg-[#0f1923] text-gray-400 text-[10px] uppercase px-2 py-1 rounded border border-gray-700 font-mono tracking-wider">
                                    {team.role}
                                </span>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-[#ff4655] transition-colors truncate">{team.name}</h3>
                                <div className="flex items-center text-gray-500 text-xs font-medium uppercase tracking-wider">
                                    <Users size={12} className="mr-1.5" />
                                    {team.memberCount} Members
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="border-2 border-dashed border-gray-700 bg-[#1f2937]/20 rounded-xl p-16 flex flex-col items-center justify-center text-center">
                    <div className="bg-gray-800/50 p-6 rounded-full mb-4">
                        <Shield size={48} className="text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">You aren't in any teams yet</h3>
                    <p className="text-gray-500 max-w-sm">
                        Use the buttons above to create your own legacy or find a squad to join.
                    </p>
                </div>
            )}
        </div>
    );
}

const MailIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} width="24" height="24">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
);