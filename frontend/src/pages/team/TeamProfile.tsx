import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
    Shield, Calendar, Trophy, UserCog, Loader2, Save, X,
    Trash2, UserMinus, UserPlus, Edit3
} from 'lucide-react';
import { RecentMatches } from "../../matches/RecentMatches.tsx";
import { TeamReviews } from "./TeamReviews.tsx";
import { getRankInfoFromString } from '../../utils/rankUtils';

interface TeamMember {
    userId: number;
    username: string;
    displayName?: string;
    riotGameName: string;
    currentRank?: string;
    role: 'OWNER' | 'CAPTAIN' | 'MEMBER';
    position: 'DUELIST' | 'CONTROLLER' | 'INITIATOR' | 'SENTINEL' | 'FLEX';
}

interface TeamData {
    id: number;
    name: string;
    tag: string;
    wins: number;
    losses: number;
    ownerId: number;
    createdAt: string;
    members: TeamMember[];
}

export default function TeamProfile() {
    const { teamId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [team, setTeam] = useState<TeamData | null>(null);
    const [loading, setLoading] = useState(true);

    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [editForm, setEditForm] = useState({ role: '', position: '' });

    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteUsername, setInviteUsername] = useState('');

    const [isRenameOpen, setIsRenameOpen] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        fetchTeamDetails();
    }, [teamId]);

    const fetchTeamDetails = async () => {
        try {
            const response = await api.get(`/teams/${teamId}`);
            setTeam(response.data);
            if (response.data) setNewName(response.data.name);
        } catch (error) {
            console.error("Failed to fetch team", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateMember = async () => {
        if (!editingMember || !team) return;
        try {
            await api.put(`/teams/${team.id}/members/${editingMember.userId}`, editForm);
            setEditingMember(null);
            fetchTeamDetails();
        } catch (error) {
            alert("Failed to update member role.");
        }
    };

    const handleKick = async (userId: number) => {
        if (!window.confirm("Are you sure you want to kick this player?")) return;
        try {
            await api.delete(`/teams/${teamId}/members/${userId}`);
            fetchTeamDetails();
        } catch (error) {
            alert("Failed to kick player.");
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/teams/${teamId}/invites?username=${inviteUsername}`);
            alert("Invite sent successfully!");
            setIsInviteOpen(false);
            setInviteUsername('');
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to send invite. User might not exist.");
        }
    };

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.patch(`/teams/${teamId}?name=${newName}`);
            setIsRenameOpen(false);
            fetchTeamDetails();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to rename team.");
        }
    };

    const handleDeleteTeam = async () => {
        if (!window.confirm("WARNING: This will permanently delete the team and all history. This cannot be undone.")) return;
        try {
            await api.delete(`/teams/${teamId}`);
            navigate('/team');
        } catch (error) {
            alert("Failed to delete team.");
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-[#ff4655]" /></div>;
    if (!team) return <div className="text-center p-20 text-white">Team not found</div>;

    const isOwner = user?.id === team.ownerId;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">

            <div className="bg-[#1f2937] border border-gray-700 rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-2 h-full bg-[#ff4655]" />
                <div className="flex items-center gap-6 z-10">
                    <div className="h-24 w-24 bg-gradient-to-br from-gray-800 to-black rounded-xl border border-gray-600 flex items-center justify-center shadow-2xl">
                        <span className="text-3xl font-black text-white tracking-widest">{team.tag}</span>
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-bold text-white uppercase tracking-tight">{team.name}</h1>
                            {isOwner && (
                                <button onClick={() => setIsRenameOpen(true)} className="text-gray-500 hover:text-white transition-colors">
                                    <Edit3 size={20} />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-gray-400 text-sm">
                            <span className="flex items-center gap-1"><Calendar size={14} /> Est. {team.createdAt}</span>
                            <span className="flex items-center gap-1"><Trophy size={14} className="text-yellow-500" /> {team.wins}W - {team.losses}L</span>
                        </div>
                    </div>
                </div>
                {isOwner && (
                    <div className="z-10 flex gap-3">
                        <button
                            onClick={() => setIsInviteOpen(true)}
                            className="bg-[#ff4655] hover:bg-[#ff4655]/90 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-red-900/20 transition-all"
                        >
                            <UserPlus size={18} /> Invite Player
                        </button>
                    </div>
                )}
            </div>

            <div>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <Shield className="text-[#ff4655]" /> Active Roster
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {team.members.map((member) => {
                        // --- 1. Compute the rank info here ---
                        const rankInfo = getRankInfoFromString(member.currentRank);

                        return (
                            <div key={member.userId} className="bg-[#1f2937]/50 border border-gray-700 p-4 rounded-lg flex items-center justify-between group hover:border-gray-500 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 font-bold border border-gray-600 shrink-0">
                                        {(member.displayName || member.username)[0].toUpperCase()}
                                    </div>

                                    <div>
                                        {/* --- 2. Make this a flex container to align name and badge --- */}
                                        <div className="flex items-center gap-2">
                                            <div className="text-white font-bold">
                                                {member.displayName || member.riotGameName || member.username}
                                            </div>

                                            {/* --- 3. Render the badge if it exists --- */}
                                            {member.currentRank && member.currentRank !== "Unranked" && rankInfo && (
                                                <span className={`text-[9px] pl-1 pr-1.5 py-0.5 rounded border font-black uppercase tracking-wider flex items-center gap-1 ${rankInfo.bg} ${rankInfo.color} ${rankInfo.border}`}>
                                                    <img src={rankInfo.icon} alt={member.currentRank} className="w-3.5 h-3.5 object-contain" />
                                                    {member.currentRank}
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-xs text-gray-500 flex gap-2 mt-0.5">
                                            <span className="text-[#ff4655] font-bold">{member.role}</span>
                                            <span>•</span>
                                            <span className="text-blue-400 font-bold">{member.position}</span>
                                        </div>
                                    </div>
                                </div>

                                {isOwner && member.role !== 'OWNER' && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setEditingMember(member); setEditForm({ role: member.role, position: member.position }); }}
                                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-md"
                                            title="Edit Role"
                                        >
                                            <UserCog size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleKick(member.userId)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-md"
                                            title="Kick Player"
                                        >
                                            <UserMinus size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12 border-t border-gray-800 pt-12">
                    <div>
                        <RecentMatches teamId={teamId!} />
                    </div>
                    <div>
                        <TeamReviews teamId={teamId!} ownerId={team.ownerId} />
                    </div>
                </div>
            </div>

            {isOwner && (
                <div className="border-t border-gray-800 pt-8 mt-12">
                    <button onClick={handleDeleteTeam} className="flex items-center gap-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors text-sm font-medium">
                        <Trash2 size={16} /> Delete Team
                    </button>
                </div>
            )}
            {isInviteOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1f2937] border border-gray-600 rounded-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Invite Player</h3>
                            <button onClick={() => setIsInviteOpen(false)} className="text-gray-400 hover:text-white"><X /></button>
                        </div>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <input type="text" placeholder="Enter username..." className="w-full bg-[#0f1923] border border-gray-600 rounded p-3 text-white focus:border-[#ff4655] outline-none" value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)} />
                            <button type="submit" className="w-full bg-[#ff4655] hover:bg-[#ff4655]/90 text-white font-bold py-3 rounded">Send Invite</button>
                        </form>
                    </div>
                </div>
            )}
            {isRenameOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1f2937] border border-gray-600 rounded-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Rename Team</h3>
                            <button onClick={() => setIsRenameOpen(false)} className="text-gray-400 hover:text-white"><X /></button>
                        </div>
                        <form onSubmit={handleRename} className="space-y-4">
                            <input type="text" className="w-full bg-[#0f1923] border border-gray-600 rounded p-3 text-white focus:border-[#ff4655] outline-none" value={newName} onChange={(e) => setNewName(e.target.value)} />
                            <button type="submit" className="w-full bg-[#ff4655] hover:bg-[#ff4655]/90 text-white font-bold py-3 rounded">Save Name</button>
                        </form>
                    </div>
                </div>
            )}
            {editingMember && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1f2937] border border-gray-600 rounded-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white">Edit {editingMember.username}</h3>
                            <button onClick={() => setEditingMember(null)} className="text-gray-400 hover:text-white"><X /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-xs uppercase mb-1">Role</label>
                                <select value={editForm.role} onChange={(e) => setEditForm({...editForm, role: e.target.value})} className="w-full bg-[#0f1923] border border-gray-600 rounded p-2 text-white">
                                    <option value="MEMBER">Member</option>
                                    <option value="CAPTAIN">Captain</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-400 text-xs uppercase mb-1">Position</label>
                                <select value={editForm.position} onChange={(e) => setEditForm({...editForm, position: e.target.value})} className="w-full bg-[#0f1923] border border-gray-600 rounded p-2 text-white">
                                    <option value="DUELIST">Duelist</option>
                                    <option value="INITIATOR">Initiator</option>
                                    <option value="CONTROLLER">Controller</option>
                                    <option value="SENTINEL">Sentinel</option>
                                    <option value="FLEX">Flex</option>
                                </select>
                            </div>
                            <button onClick={handleUpdateMember} className="w-full bg-[#ff4655] hover:bg-[#ff4655]/90 text-white font-bold py-3 rounded flex justify-center gap-2"><Save size={18} /> Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}