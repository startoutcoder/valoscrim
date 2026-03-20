import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Users, Hash, Mic, Trophy, AlertCircle, Loader2, ChevronDown } from 'lucide-react';

export default function CreateTeam() {
    const navigate = useNavigate();
    const { refreshUser } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        tag: '',
        micAvailable: true,
        minimumAge: 16,
        competitiveness: 5
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.post('/teams', formData);

            await new Promise(resolve => setTimeout(resolve, 500));

            await refreshUser();

            navigate('/team');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to create team. Name might be taken.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto pb-20">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight">Establish New Team</h1>
                <p className="text-gray-400 mt-1">Create your organization's identity and set your recruitment standards.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-[#1f2937] border border-gray-700 rounded-xl p-8 space-y-8 shadow-2xl">

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg flex items-center gap-3">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="space-y-6">
                    <h2 className="text-lg font-bold text-white border-b border-gray-700 pb-2">Team Identity</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Team Name</label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full bg-[#0f1923] border border-gray-600 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#ff4655] focus:ring-1 focus:ring-[#ff4655]"
                                    placeholder="e.g. Sentinels"
                                    required
                                    minLength={3}
                                    maxLength={30}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Tag</label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                                <input
                                    type="text"
                                    value={formData.tag}
                                    onChange={(e) => setFormData({...formData, tag: e.target.value.toUpperCase()})}
                                    className="w-full bg-[#0f1923] border border-gray-600 rounded-lg py-3 pl-10 pr-4 text-white uppercase font-mono focus:outline-none focus:border-[#ff4655] focus:ring-1 focus:ring-[#ff4655]"
                                    placeholder="SEN"
                                    required
                                    minLength={2}
                                    maxLength={5}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-lg font-bold text-white border-b border-gray-700 pb-2">Roster Requirements</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <div className="bg-[#0f1923] p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${formData.micAvailable ? 'bg-green-500/20 text-green-500' : 'bg-gray-700 text-gray-500'}`}>
                                    <Mic size={20} />
                                </div>
                                <div>
                                    <div className="text-white font-medium">Microphone</div>
                                    <div className="text-xs text-gray-400">Required for all members</div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({...formData, micAvailable: !formData.micAvailable})}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.micAvailable ? 'bg-[#ff4655]' : 'bg-gray-600'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.micAvailable ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Minimum Age</label>
                            <div className="relative">
                                <select
                                    value={formData.minimumAge}
                                    onChange={(e) => setFormData({...formData, minimumAge: Number(e.target.value)})}
                                    className="w-full bg-[#0f1923] border border-gray-600 rounded-lg py-3 px-4 text-white appearance-none focus:outline-none focus:border-[#ff4655]"
                                >
                                    <option value={13}>13+ (Minimum)</option>
                                    <option value={16}>16+</option>
                                    <option value={18}>18+ (Adults Only)</option>
                                    <option value={21}>21+</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#0f1923] p-6 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                <Trophy size={16} className="text-[#ff4655]" />
                                Competitiveness Level
                            </label>
                            <span className="text-[#ff4655] font-bold text-lg">{formData.competitiveness}/10</span>
                        </div>

                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={formData.competitiveness}
                            onChange={(e) => setFormData({...formData, competitiveness: Number(e.target.value)})}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#ff4655]"
                        />

                        <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono uppercase">
                            <span>Chill / For Fun</span>
                            <span>Balanced</span>
                            <span>Playing to Win</span>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#ff4655] hover:bg-[#ff4655]/90 text-white font-bold py-4 rounded-lg transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'CREATE TEAM'}
                </button>
            </form>
        </div>
    );
}