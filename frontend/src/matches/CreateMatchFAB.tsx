import { useState } from 'react';
import { Plus, X, User, Users, Calendar, Loader2, Map as MapIcon } from 'lucide-react';
import { useAuth } from "../context/AuthContext";
import { api } from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { Select, type SelectOption } from '../UI/Select';

export default function CreateMatchFAB() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<'SOLO' | 'TEAM'>('SOLO');
    const [mapSelectionMode, setMapSelectionMode] = useState<'VETO' | 'SELECT'>('VETO');
    const [loading, setLoading] = useState(false);

    const [selectedTeamId, setSelectedTeamId] = useState<number | string>('');
    const [startTime, setStartTime] = useState('');

    const teamOptions: SelectOption[] = user?.teams ? user.teams.map((team: any) => ({
        value: team.id,
        label: `${team.name} [${team.tag}]`
    })) : [];

    const handleCreate = async () => {
        setLoading(true);
        try {
            if (mode === 'SOLO') {
                await api.post(`/matches/solo?mapSelectionMode=${mapSelectionMode}`);
                window.dispatchEvent(new Event('match-created'));

                setIsOpen(false);
                navigate('/matches');
            } else {
                if (!selectedTeamId) {
                    alert("Please select a team.");
                    setLoading(false);
                    return;
                }

                const finalTime = startTime ? startTime : new Date().toISOString().slice(0, 19);

                await api.post('/matches', {
                    teamId: Number(selectedTeamId),
                    startTime: finalTime,
                    mapSelectionMode: mapSelectionMode
                });

                window.dispatchEvent(new Event('match-created'));

                setIsOpen(false);
                navigate('/matches');
            }
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || "Failed to create match");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-8 z-50 bg-[#ff4655] hover:bg-[#ff4655]/90 text-white rounded-full p-4 shadow-lg shadow-red-900/40 transition-transform hover:scale-110 active:scale-95 group"
                title="Create Match"
            >
                <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1f2937] border border-gray-600 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">

                        <div className="flex justify-between items-center p-6 bg-[#0f1923] border-b border-gray-700">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Plus className="text-[#ff4655]" /> Create Match
                            </h2>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">

                            <div className="grid grid-cols-2 gap-2 bg-black/20 p-1 rounded-lg">
                                <button
                                    onClick={() => setMode('SOLO')}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-md font-bold text-sm transition-all ${
                                        mode === 'SOLO'
                                            ? 'bg-blue-600 text-white shadow-lg'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <User size={18} /> Solo Queue
                                </button>
                                <button
                                    onClick={() => setMode('TEAM')}
                                    className={`flex items-center justify-center gap-2 py-3 rounded-md font-bold text-sm transition-all ${
                                        mode === 'TEAM'
                                            ? 'bg-[#ff4655] text-white shadow-lg'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <Users size={18} /> Team Scrim
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-gray-400 font-bold mb-2">Map Selection Mode</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setMapSelectionMode('VETO')}
                                        className={`py-2 rounded border text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mapSelectionMode === 'VETO' ? 'bg-[#ff4655]/20 border-[#ff4655] text-[#ff4655]' : 'bg-[#0f1923] border-gray-600 text-gray-400 hover:text-white'}`}
                                    >
                                        <MapIcon size={16} /> Veto Process
                                    </button>
                                    <button
                                        onClick={() => setMapSelectionMode('SELECT')}
                                        className={`py-2 rounded border text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mapSelectionMode === 'SELECT' ? 'bg-[#ff4655]/20 border-[#ff4655] text-[#ff4655]' : 'bg-[#0f1923] border-gray-600 text-gray-400 hover:text-white'}`}
                                    >
                                        <MapIcon size={16} /> Host Selects
                                    </button>
                                </div>
                            </div>

                            {mode === 'SOLO' ? (
                                <div className="text-center py-2 space-y-3">
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                                        <p className="text-blue-200 text-sm">
                                            Create a lobby for individual players. Teams will be auto-balanced based on rank.
                                        </p>
                                    </div>
                                </div>) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs uppercase text-gray-400 font-bold mb-2">Select Your Team</label>
                                        {user.teams && user.teams.length > 0 ? (
                                            <Select
                                                options={teamOptions}
                                                value={selectedTeamId}
                                                onChange={setSelectedTeamId}
                                                placeholder="-- Choose Team --"
                                            />
                                        ) : (
                                            <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded border border-red-500/20">
                                                You must create a team first!
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs uppercase text-gray-400 font-bold mb-2">Start Time (Optional)</label>
                                        <div className="relative">
                                            <input
                                                type="datetime-local"
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                className="w-full bg-[#0f1923] border border-gray-600 rounded-lg p-3 text-white focus:border-[#ff4655] outline-none transition-colors"
                                            />
                                            <Calendar className="absolute right-3 top-3 text-gray-500 pointer-events-none" size={20} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleCreate}
                                disabled={loading || (mode === 'TEAM' && (!user.teams || user.teams.length === 0 || !selectedTeamId))}
                                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
                                    mode === 'SOLO'
                                        ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                                        : 'bg-[#ff4655] hover:bg-[#ff4655]/90 shadow-red-900/20 disabled:bg-gray-600 disabled:cursor-not-allowed'
                                }`}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Create Match'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}