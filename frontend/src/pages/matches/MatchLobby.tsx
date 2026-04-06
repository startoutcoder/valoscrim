import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';
import {
    Loader2,
    Map as MapIcon,
    User,
    CheckCircle,
    Ban,
    AlertTriangle,
    Shield,
    Clock,
    Copy,
    Gamepad2,
    Users,
    Repeat,
    Save,
    Edit3,
    X
} from 'lucide-react';
import { Toast, type ToastType } from '../../UI/Toast';
import { Client } from '@stomp/stompjs';
import { useAuth } from '../../context/AuthContext.tsx';
import SockJS from 'sockjs-client';
import { getRankInfoFromString } from '../../utils/rankUtils';

interface LobbyPlayer {
    id: number;
    username: string;
    riotGameName?: string;
    ready: boolean;
    currentRank?: string;
    teamRole?: 'OWNER' | 'CAPTAIN' | 'MEMBER' | 'SUB' | null;
}

interface LobbyTeam {
    id: number;
    name: string;
    tag: string;
    ready: boolean;
    members: LobbyPlayer[];
    starters: LobbyPlayer[];
    bench: LobbyPlayer[];
}

interface MatchLobbyDetail {
    id: number;
    matchType: 'SOLO' | 'TEAM';
    status: string;
    mapName: string | null;
    partyCode?: string | null;
    mapSelectionMode?: 'VETO' | 'SELECT';
    players?: LobbyPlayer[];
    teamHome?: LobbyTeam;
    teamAway?: LobbyTeam;
}

const MAP_IMAGES: Record<string, string> = {
    Ascent: '/maps/Ascent.png',
    Bind: '/maps/Bind.png',
    Haven: '/maps/Haven.png',
    Icebox: '/maps/Icebox.png',
    Lotus: '/maps/Lotus.png',
    Pearl: '/maps/Pearl.png',
    Split: '/maps/Split.png',
    Sunset: '/maps/Sunset.png',
    Breeze: '/maps/Breeze.webp',
    Fracture: '/maps/Fracture.webp',
    Abyss: '/maps/Abyss.webp',
    Unknown:
        'https://media.valorant-api.com/maps/ee611ee9-46f2-fba7-a2d8-58bc4c52f950/splash.png'
};

const ALL_MAPS = Object.keys(MAP_IMAGES).filter((m) => m !== 'Unknown');

export default function MatchLobby() {
    const { matchId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [match, setMatch] = useState<MatchLobbyDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);

    const [bannedMaps, setBannedMaps] = useState<string[]>([]);
    const [timeLeft, setTimeLeft] = useState(10);

    const isFetching = useRef(false);
    const stompClientRef = useRef<Client | null>(null);

    const [newTime, setNewTime] = useState('');
    const [isRescheduling, setIsRescheduling] = useState(false);

    const [partyCodeInput, setPartyCodeInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [isEditingPartyCode, setIsEditingPartyCode] = useState(false);

    const [selectedStarterIds, setSelectedStarterIds] = useState<number[]>([]);
    const [savingLineup, setSavingLineup] = useState(false);

    const [selectedStarterOutId, setSelectedStarterOutId] = useState<number | null>(null);
    const [substituting, setSubstituting] = useState(false);

    const isSolo = match?.matchType === 'SOLO';

    const homeMember = match?.teamHome?.members.find((m) => m.username === user?.username) ?? null;
    const awayMember = match?.teamAway?.members.find((m) => m.username === user?.username) ?? null;

    const myTeamMember = homeMember ?? awayMember ?? null;
    const myTeamRole = myTeamMember?.teamRole ?? null;

    const isTeamOwner = myTeamRole === 'OWNER';
    const canManageTeamLobby = myTeamRole === 'OWNER' || myTeamRole === 'CAPTAIN';

    const isSoloParticipant = !!match?.players?.some((p) => p.username === user?.username);

    const canModifyMatchDetails = isSolo ? isSoloParticipant : isTeamOwner;
    const canReadyUp = isSolo ? isSoloParticipant : canManageTeamLobby;
    const canDeleteLobby = isSolo
        ? isSoloParticipant
        : !!homeMember && myTeamRole === 'OWNER';
    const canReschedule = !isSolo && isTeamOwner;
    const canLeaveLobby = isSolo && isSoloParticipant;

    const totalBans = bannedMaps.length;
    const currentPhase = Math.min(Math.floor(totalBans / 2) + 1, 5);
    const isHomeTurn = totalBans % 2 === 0;

    const isMyTurn = useMemo(() => {
        if (!match || !user || match.status === 'OPEN' || match.mapSelectionMode !== 'VETO') {
            return false;
        }

        if (isSolo) {
            const myIndex = match.players?.findIndex((p) => p.username === user.username) ?? -1;
            const inHomeTeam = myIndex >= 0 && myIndex < 5;
            const inAwayTeam = myIndex >= 5;
            return Boolean((isHomeTurn && inHomeTeam) || (!isHomeTurn && inAwayTeam));
        } else {
            const inHomeTeam = match.teamHome?.members.some((m) => m.username === user.username);
            const inAwayTeam = match.teamAway?.members.some((m) => m.username === user.username);
            return Boolean((isHomeTurn && inHomeTeam) || (!isHomeTurn && inAwayTeam));
        }
    }, [match, user, isSolo, isHomeTurn]);

    const managedTeam = useMemo(() => {
        if (!match || !user || isSolo) return null;

        const canManage = (team?: LobbyTeam) =>
            !!team?.members.some(
                (m) =>
                    m.username === user.username &&
                    (m.teamRole === 'OWNER' || m.teamRole === 'CAPTAIN')
            );

        if (canManage(match.teamHome)) return match.teamHome;
        if (canManage(match.teamAway)) return match.teamAway;
        return null;
    }, [match, user, isSolo]);

    useEffect(() => {
        if (!isMyTurn) {
            setTimeLeft(10);
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timerId);
    }, [isMyTurn, totalBans]);

    useEffect(() => {
        if (isMyTurn && timeLeft === 0) {
            const availableMaps = ALL_MAPS.filter(m => !bannedMaps.includes(m));
            if (availableMaps.length > 0) {
                const randomMap = availableMaps[Math.floor(Math.random() * availableMaps.length)];
                handleBanMap(randomMap);
            }
        }
    }, [timeLeft, isMyTurn, bannedMaps]);

    const rawWsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws';
    const sockJsUrl = rawWsUrl.replace('wss://', 'https://').replace('ws://', 'http://');

    useEffect(() => {
        fetchLobby();

        const stompClient = new Client({
            webSocketFactory: () => new SockJS(sockJsUrl),
            reconnectDelay: 5000,
            debug: (str) => {
                console.log('STOMP: ' + str);
            },
            onConnect: () => {
                console.log('✅ STOMP CONNECTED PERFECTLY!');
                stompClient.subscribe(`/topic/match-${matchId}`, (message) => {
                    if (message.body === 'DELETED') {
                        alert('This lobby has been deleted.');
                        navigate('/matches');
                    } else if (message.body === 'REFRESH' && !isFetching.current) {
                        fetchLobby();
                    }
                });

                stompClient.subscribe(`/topic/match-${matchId}-veto`, (message) => {
                    const bannedMap = message.body;
                    setBannedMaps((prev) => {
                        if (!prev.includes(bannedMap)) return [...prev, bannedMap];
                        return prev;
                    });
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            }
        });

        stompClient.activate();
        stompClientRef.current = stompClient;

        return () => {
            stompClient.deactivate();
        };
    }, [matchId, navigate]);

    useEffect(() => {
        if (!managedTeam) {
            setSelectedStarterIds([]);
            return;
        }
        setSelectedStarterIds(managedTeam.starters.map((p) => p.id));
    }, [managedTeam]);

    const fetchLobby = async () => {
        isFetching.current = true;
        try {
            const res = await api.get(`/matches/${matchId}`);
            setMatch(res.data);
        } catch (error: any) {
            console.error('Failed to load lobby', error);
            if (error.response?.status === 404) {
                navigate('/matches');
            }
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    };

    const handleEditPartyCodeClick = () => {
        setPartyCodeInput(match?.partyCode || '');
        setIsEditingPartyCode(true);
    };

    const handleCancelEditPartyCode = () => {
        setIsEditingPartyCode(false);
        setPartyCodeInput('');
    };

    const handleSavePartyCode = async () => {
        try {
            await api.patch(`/matches/${matchId}/party-code?code=${encodeURIComponent(partyCodeInput)}`);
            setToast({ msg: 'In-Game code broadcasted to lobby!', type: 'success' });
            setPartyCodeInput('');
            setIsEditingPartyCode(false);
            await fetchLobby();
        } catch (err: any) {
            setToast({
                msg: err.response?.data?.message || 'Failed to update party code.',
                type: 'error'
            });
        }
    };

    const handleCopyPartyCode = () => {
        if (match?.partyCode) {
            navigator.clipboard.writeText(match.partyCode);
            setCopied(true);
            setToast({ msg: 'Party Code copied! Paste this in Valorant.', type: 'info' });
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleToggleStarterSelection = (userId: number) => {
        setSelectedStarterIds((prev) => {
            if (prev.includes(userId)) {
                if (prev.length === 5) {
                    setToast({ msg: 'Starting five must always contain 5 players.', type: 'error' });
                    return prev;
                }
                return prev.filter((id) => id !== userId);
            }

            if (prev.length >= 5) {
                setToast({ msg: 'You can only select exactly 5 starters.', type: 'error' });
                return prev;
            }

            return [...prev, userId];
        });
    };

    const handleSaveStartingFive = async () => {
        if (!managedTeam) return;

        if (selectedStarterIds.length !== 5) {
            setToast({ msg: 'You must select exactly 5 starters.', type: 'error' });
            return;
        }

        try {
            setSavingLineup(true);
            await api.post(`/matches/${matchId}/lineup`, {
                starterUserIds: selectedStarterIds
            });
            setSelectedStarterOutId(null);
            setToast({ msg: 'Starting five updated.', type: 'success' });
            await fetchLobby();
        } catch (err: any) {
            setToast({
                msg: err.response?.data?.message || 'Failed to update starting five.',
                type: 'error'
            });
        } finally {
            setSavingLineup(false);
        }
    };

    const handleSubstitute = async (benchPlayerId: number) => {
        if (!selectedStarterOutId) {
            setToast({ msg: 'Choose a starter to sub out first.', type: 'error' });
            return;
        }

        try {
            setSubstituting(true);
            await api.post(`/matches/${matchId}/lineup/substitute`, {
                playerOutUserId: selectedStarterOutId,
                playerInUserId: benchPlayerId
            });
            setSelectedStarterOutId(null);
            setToast({ msg: 'Substitution completed.', type: 'success' });
            await fetchLobby();
        } catch (err: any) {
            setToast({
                msg: err.response?.data?.message || 'Failed to substitute player.',
                type: 'error'
            });
        } finally {
            setSubstituting(false);
        }
    };

    const handleBanMap = async (mapName: string) => {
        if (!match || !isMyTurn || bannedMaps.includes(mapName)) return;

        if (stompClientRef.current?.connected) {
            stompClientRef.current.publish({
                destination: `/app/matches/${matchId}/veto`,
                body: JSON.stringify({
                    mapName: mapName,
                    username: user?.username
                })
            });
        }

        const newBannedCount = bannedMaps.length + 1;
        if (newBannedCount === ALL_MAPS.length - 1) {
            const remainingMaps = ALL_MAPS.filter((m) => m !== mapName && !bannedMaps.includes(m));
            const finalMap = remainingMaps[0];

            try {
                await api.patch(`/matches/${matchId}/map`, { mapName: finalMap });
                setToast({ msg: `${finalMap} selected!`, type: 'success' });
                await fetchLobby();
            } catch (err: any) {
                setToast({
                    msg: err.response?.data?.message || 'Failed to save final map.',
                    type: 'error'
                });
            }
        }
    };

    const handleSelectMap = async (mapName: string) => {
        if (!canModifyMatchDetails) return;
        try {
            await api.patch(`/matches/${matchId}/map`, { mapName });
            setToast({ msg: `${mapName} selected!`, type: 'success' });
            await fetchLobby();
        } catch (err: any) {
            setToast({
                msg: err.response?.data?.message || 'Failed to select map.',
                type: 'error'
            });
        }
    };

    const handleReady = async () => {
        try {
            await api.post(`/matches/${matchId}/ready`);
            await fetchLobby();
        } catch (err: any) {
            setToast({
                msg: err.response?.data?.message || 'Failed to ready up.',
                type: 'error'
            });
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to permanently delete this lobby?')) return;
        try {
            await api.post(`/matches/${matchId}/cancel`);
            navigate('/matches');
        } catch (err: any) {
            setToast({ msg: err.response?.data?.message || 'Failed to delete lobby', type: 'error' });
        }
    };

    const handleReschedule = async () => {
        if (!newTime) return;
        try {
            await api.patch(`/matches/${matchId}/schedule?newTime=${newTime}:00`);
            setToast({ msg: 'Match rescheduled successfully!', type: 'success' });
            setIsRescheduling(false);
            await fetchLobby();
        } catch (err: any) {
            setToast({ msg: err.response?.data?.message || 'Failed to reschedule', type: 'error' });
        }
    };

    const handleLeave = async () => {
        if (!window.confirm('Are you sure you want to leave?')) return;
        try {
            await api.post(`/matches/${matchId}/leave`);
            navigate('/matches');
        } catch (err: any) {
            setToast({
                msg: err.response?.data?.message || 'Failed to leave lobby',
                type: 'error'
            });
        }
    };

    if (loading || !match) {
        return (
            <div className="flex justify-center p-20">
                <Loader2 className="animate-spin text-[#ff4655]" />
            </div>
        );
    }

    const mapKey = match.mapName ? match.mapName : 'Unknown';
    const bgImage = MAP_IMAGES[mapKey];

    const isLobbyFull = match.status !== 'OPEN';
    const showMapGrid = !match.mapName;

    let turnText = 'Waiting for players...';

    if (showMapGrid) {
        if (match.mapSelectionMode === 'VETO' && !isLobbyFull) {
            turnText = 'Waiting for lobby to fill to begin Veto...';
        } else if (totalBans >= 10) {
            turnText = 'Locking in final map...';
        } else if (isSolo) {
            turnText = isHomeTurn ? 'Team 1 Banning...' : 'Team 2 Banning...';
        } else {
            turnText = isHomeTurn
                ? `${match.teamHome?.name || 'Home Team'} Banning...`
                : `${match.teamAway?.name || 'Away Team'} Banning...`;
        }
    }

    return (
        <div className="max-w-6xl mx-auto pb-20 space-y-8">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

            <div
                className={`relative h-64 rounded-2xl overflow-hidden border transition-all duration-500 ${
                    showMapGrid
                        ? 'border-[#ff4655] shadow-[0_0_30px_rgba(255,70,85,0.2)]'
                        : 'border-gray-700 shadow-2xl'
                }`}
            >
                <div
                    className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out ${
                        showMapGrid ? 'opacity-20 grayscale blur-sm' : 'opacity-40 group-hover:scale-105'
                    }`}
                    style={{ backgroundImage: `url('${bgImage}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f1923] via-[#0f1923]/60 to-transparent" />

                <div className="absolute bottom-6 left-6 z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <span
                            className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-widest shadow-lg ${
                                match.status === 'OPEN' ? 'bg-green-500 text-white' : 'bg-[#ff4655] text-white'
                            }`}
                        >
                            {match.status}
                        </span>

                        {showMapGrid ? (
                            <span className="bg-[#ff4655]/20 text-[#ff4655] text-xs font-bold px-3 py-1 rounded uppercase flex items-center gap-2 border border-[#ff4655]/50 animate-pulse">
                                <AlertTriangle size={14} />
                                {match.mapSelectionMode === 'SELECT'
                                    ? 'MAP SELECTION'
                                    : !isLobbyFull
                                        ? 'WAITING FOR PLAYERS'
                                        : 'VETO IN PROGRESS'}
                            </span>
                        ) : (
                            <span className="bg-gray-800/80 backdrop-blur text-gray-300 text-xs font-bold px-3 py-1 rounded uppercase flex items-center gap-2 border border-gray-600">
                                <MapIcon size={14} /> {match.mapName || 'Pending'}
                            </span>
                        )}
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase drop-shadow-lg">
                        Lobby #{match.id}
                    </h1>
                </div>

                <div className="absolute bottom-6 right-6 z-10 flex gap-3">
                    {canReadyUp && (
                        <button
                            onClick={handleReady}
                            className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-all active:scale-95 flex items-center gap-2 border border-green-400/30"
                        >
                            <CheckCircle size={20} /> READY UP
                        </button>
                    )}

                    {canLeaveLobby && (
                        <button
                            onClick={handleLeave}
                            className="bg-red-500/20 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/50 font-bold py-3 px-6 rounded-lg transition-all"
                        >
                            LEAVE
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-[#1f2937] border border-gray-700 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-gray-400">
                    <Shield size={18} className="text-[#ff4655]" />
                    <span className="text-sm font-bold uppercase tracking-wider">Lobby Controls</span>
                </div>

                <div className="flex gap-3">
                    {canReschedule && (
                        <div className="flex items-center gap-2">
                            {isRescheduling ? (
                                <>
                                    <input
                                        type="datetime-local"
                                        value={newTime}
                                        onChange={(e) => setNewTime(e.target.value)}
                                        className="bg-[#0f1923] border border-gray-600 rounded p-2 text-white text-sm outline-none"
                                    />
                                    <button
                                        onClick={handleReschedule}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold transition-colors"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setIsRescheduling(false)}
                                        className="text-gray-400 hover:text-white px-2 text-sm"
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsRescheduling(true)}
                                    className="border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 px-4 py-2 rounded text-sm font-bold transition-all"
                                >
                                    Reschedule Match
                                </button>
                            )}
                        </div>
                    )}

                    {canDeleteLobby && (
                        <button
                            onClick={handleDelete}
                            className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 px-4 py-2 rounded text-sm font-bold transition-all"
                        >
                            Delete Lobby
                        </button>
                    )}
                </div>
            </div>

            {!isSolo && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 rounded-xl p-4">
                    Team players cannot leave individually. Team owners or captains should manage the lineup, and only the home team owner can delete the lobby.
                </div>
            )}

            {(match.partyCode || canModifyMatchDetails) && (
                <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/50 rounded-xl p-6 shadow-lg shadow-blue-900/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-500/20 p-3 rounded-lg text-blue-400">
                                <Gamepad2 size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Valorant Party Code</h2>
                                <p className="text-blue-200/70 text-sm">
                                    {match.partyCode
                                        ? 'Copy this code and paste it in-game to join the custom lobby.'
                                        : 'Waiting for an authorized player to generate the in-game lobby...'}
                                </p>
                            </div>
                        </div>

                        {match.partyCode && !isEditingPartyCode ? (
                            <div className="flex gap-2 w-full md:w-auto">
                                <button
                                    onClick={handleCopyPartyCode}
                                    className="flex items-center gap-3 bg-[#0f1923] hover:bg-gray-800 border border-blue-500/30 px-6 py-3 rounded-lg transition-all group flex-1 md:flex-none justify-center"
                                >
                                    <span className="font-mono text-xl font-bold text-white tracking-widest">
                                        {match.partyCode}
                                    </span>
                                    {copied ? (
                                        <CheckCircle size={20} className="text-green-400" />
                                    ) : (
                                        <Copy size={20} className="text-gray-400 group-hover:text-white" />
                                    )}
                                </button>

                                {canModifyMatchDetails && (
                                    <button
                                        onClick={handleEditPartyCodeClick}
                                        className="flex items-center justify-center bg-[#0f1923] hover:bg-gray-800 border border-blue-500/30 px-4 py-3 rounded-lg transition-all text-gray-400 hover:text-white"
                                        title="Edit Party Code"
                                    >
                                        <Edit3 size={20} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            canModifyMatchDetails && (
                                <div className="flex w-full md:w-auto">
                                    <input
                                        type="text"
                                        placeholder="Paste Code Here..."
                                        value={partyCodeInput}
                                        onChange={(e) => setPartyCodeInput(e.target.value)}
                                        className="bg-[#0f1923] border border-blue-500/30 rounded-l-lg p-3 text-white focus:outline-none focus:border-blue-400 w-full md:w-48 font-mono"
                                    />
                                    <button
                                        onClick={handleSavePartyCode}
                                        disabled={!partyCodeInput}
                                        className={`bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold px-6 py-3 transition-colors ${isEditingPartyCode ? '' : 'rounded-r-lg'}`}
                                    >
                                        Save
                                    </button>
                                    {isEditingPartyCode && (
                                        <button
                                            onClick={handleCancelEditPartyCode}
                                            className="bg-red-500/20 hover:bg-red-500 hover:text-white text-red-500 border-y border-r border-red-500/30 font-bold px-4 py-3 rounded-r-lg transition-colors"
                                            title="Cancel Edit"
                                        >
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {showMapGrid && (
                <div className="bg-[#1f2937] border border-gray-700 rounded-xl p-6 shadow-xl animate-in slide-in-from-bottom-4 fade-in duration-500">
                    {match.mapSelectionMode === 'SELECT' ? (
                        <div className="mb-6">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
                                Map Selection
                            </h2>
                            <p className="text-[#ff4655] font-bold text-lg flex items-center gap-2">
                                <Shield size={18} />{' '}
                                {canModifyMatchDetails
                                    ? 'Select the map for this match'
                                    : 'Waiting for an authorized player to select map...'}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                                        Phase {currentPhase}/5
                                    </h2>
                                    {isMyTurn ? (
                                        <span className={`text-xs font-bold px-2 py-1 rounded animate-pulse border transition-colors ${
                                            timeLeft <= 3
                                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                                : 'bg-green-500/20 text-green-400 border-green-500/30'
                                        }`}>
                                            Your Turn ({timeLeft}s)
                                        </span>
                                    ) : (
                                        <span className="bg-gray-700 text-gray-400 text-xs font-bold px-2 py-1 rounded">
                                            Opponent's Turn
                                        </span>
                                    )}
                                </div>
                                <p className="text-[#ff4655] font-bold text-lg flex items-center gap-2">
                                    <Shield size={18} /> {turnText}
                                </p>
                            </div>
                            <div className="text-right bg-[#0f1923] p-3 rounded-lg border border-gray-700">
                                <span className="text-3xl font-black text-white">
                                    {ALL_MAPS.length - bannedMaps.length}
                                </span>
                                <span className="text-gray-500 block text-xs uppercase font-bold tracking-widest">
                                    Maps Left
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {ALL_MAPS.map((map) => {
                            const isBanned =
                                match.mapSelectionMode === 'VETO' && bannedMaps.includes(map);
                            const canInteract =
                                match.mapSelectionMode === 'SELECT' ? canModifyMatchDetails : isMyTurn;

                            return (
                                <button
                                    key={map}
                                    disabled={isBanned || !canInteract}
                                    onClick={() =>
                                        match.mapSelectionMode === 'SELECT'
                                            ? handleSelectMap(map)
                                            : handleBanMap(map)
                                    }
                                    className={`relative h-24 rounded-lg overflow-hidden group transition-all duration-300 
                                        ${
                                        isBanned
                                            ? 'opacity-30 cursor-not-allowed'
                                            : canInteract
                                                ? 'hover:ring-2 hover:ring-[#ff4655] hover:scale-105 cursor-pointer shadow-lg'
                                                : 'cursor-not-allowed grayscale-[50%]'
                                    }`}
                                >
                                    <div
                                        className={`absolute inset-0 bg-cover bg-center ${
                                            isBanned ? 'grayscale' : ''
                                        }`}
                                        style={{ backgroundImage: `url('${MAP_IMAGES[map]}')` }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                    <span
                                        className={`absolute bottom-2 left-2 font-bold text-sm tracking-widest uppercase ${
                                            isBanned
                                                ? 'text-gray-500 line-through'
                                                : 'text-white drop-shadow-md'
                                        }`}
                                    >
                                        {map}
                                    </span>
                                    {isBanned && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Ban className="text-red-500 h-10 w-10 opacity-80" strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {isSolo ? (
                <div className="bg-[#1f2937] border border-gray-700 rounded-xl p-6 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <User className="text-[#ff4655]" /> Players ({match.players?.length || 0}/10)
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {match.players?.map((player) => {
                            const rankInfo = getRankInfoFromString(player.currentRank);

                            return (
                                <div
                                    key={player.id}
                                    className="flex items-center justify-between bg-[#0f1923] p-4 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
                                >
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-white font-bold">
                                                {player.riotGameName || player.username}
                                            </div>

                                            {player.currentRank &&
                                                player.currentRank !== 'Unranked' &&
                                                rankInfo && (
                                                    <span
                                                        className={`text-[9px] pl-1 pr-1.5 py-0.5 rounded border font-black uppercase tracking-wider flex items-center gap-1 ${rankInfo.bg} ${rankInfo.color} ${rankInfo.border}`}
                                                    >
                                                        <img
                                                            src={rankInfo.icon}
                                                            alt={player.currentRank}
                                                            className="w-3.5 h-3.5 object-contain"
                                                        />
                                                        {player.currentRank}
                                                    </span>
                                                )}
                                        </div>
                                        {player.riotGameName && (
                                            <div className="text-xs text-gray-500">@{player.username}</div>
                                        )}
                                    </div>
                                    {player.ready ? (
                                        <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border border-green-500/20">
                                            Ready
                                        </span>
                                    ) : (
                                        <span className="bg-gray-700/50 text-gray-500 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                                            Waiting
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                        {[...Array(Math.max(0, 10 - (match.players?.length || 0)))].map((_, i) => (
                            <div
                                key={`empty-${i}`}
                                className="flex items-center justify-center bg-[#0f1923]/30 p-4 rounded-lg border border-gray-700 border-dashed text-gray-600 font-mono text-sm uppercase"
                            >
                                Empty Slot
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12 relative">
                    <TeamColumn
                        team={match.teamHome}
                        side="HOME"
                        navigate={navigate}
                        canManage={managedTeam?.id === match.teamHome?.id}
                        selectedStarterIds={selectedStarterIds}
                        onToggleStarterSelection={handleToggleStarterSelection}
                        onSaveStartingFive={handleSaveStartingFive}
                        savingLineup={savingLineup}
                        selectedStarterOutId={selectedStarterOutId}
                        onSelectStarterOut={setSelectedStarterOutId}
                        onSubstitute={handleSubstitute}
                        substituting={substituting}
                    />

                    <div className="hidden xl:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <div className="bg-[#0f1923] border border-gray-500 p-3 rounded-full shadow-lg">
                            <span className="text-white font-black text-xl italic">VS</span>
                        </div>
                    </div>

                    <TeamColumn
                        team={match.teamAway}
                        side="AWAY"
                        navigate={navigate}
                        canManage={managedTeam?.id === match.teamAway?.id}
                        selectedStarterIds={selectedStarterIds}
                        onToggleStarterSelection={handleToggleStarterSelection}
                        onSaveStartingFive={handleSaveStartingFive}
                        savingLineup={savingLineup}
                        selectedStarterOutId={selectedStarterOutId}
                        onSelectStarterOut={setSelectedStarterOutId}
                        onSubstitute={handleSubstitute}
                        substituting={substituting}
                    />
                </div>
            )}
        </div>
    );
}

function TeamColumn({
                        team,
                        side,
                        navigate,
                        canManage,
                        selectedStarterIds,
                        onToggleStarterSelection,
                        onSaveStartingFive,
                        savingLineup,
                        selectedStarterOutId,
                        onSelectStarterOut,
                        onSubstitute,
                        substituting
                    }: {
    team?: LobbyTeam;
    side: 'HOME' | 'AWAY';
    navigate: ReturnType<typeof useNavigate>;
    canManage: boolean;
    selectedStarterIds: number[];
    onToggleStarterSelection: (userId: number) => void;
    onSaveStartingFive: () => void;
    savingLineup: boolean;
    selectedStarterOutId: number | null;
    onSelectStarterOut: (userId: number | null) => void;
    onSubstitute: (benchPlayerId: number) => void;
    substituting: boolean;
}) {
    if (!team) {
        return (
            <div className="border-2 border-dashed border-gray-700 rounded-xl p-10 flex flex-col items-center justify-center text-gray-500 h-full bg-[#1f2937]/20 min-h-[300px]">
                <Clock size={48} className="mb-4 opacity-50" />
                <h3 className="text-xl font-bold">Waiting for Opponent...</h3>
                <p className="text-sm mt-2">Share the Lobby ID to invite a team.</p>
            </div>
        );
    }

    const starters = team.starters || [];
    const bench = team.bench || [];

    return (
        <div className={`space-y-6 ${side === 'AWAY' ? 'xl:text-right' : ''}`}>
            <div className={`flex items-center gap-4 ${side === 'AWAY' ? 'xl:flex-row-reverse' : ''}`}>
                <div
                    onClick={() => navigate(`/team/${team.id}`)}
                    className={`h-20 w-20 bg-gradient-to-br from-gray-800 to-black rounded-xl border flex items-center justify-center shadow-lg shrink-0 cursor-pointer hover:scale-105 hover:border-[#ff4655] transition-all z-10 ${
                        team.ready ? 'border-green-500 shadow-green-900/20' : 'border-gray-600'
                    }`}
                    title={`View ${team.name} Profile`}
                >
                    <span className="text-3xl font-black text-white">{team.tag}</span>
                </div>

                <div>
                    <h2
                        onClick={() => navigate(`/team/${team.id}`)}
                        className="text-3xl font-bold text-white leading-none mb-1 cursor-pointer hover:text-[#ff4655] transition-colors inline-block"
                        title={`View ${team.name} Profile`}
                    >
                        {team.name}
                    </h2>

                    <div className={`flex items-center gap-2 ${side === 'AWAY' ? 'xl:flex-row-reverse' : ''}`}>
                        <span
                            className={`font-bold text-sm tracking-widest ${
                                side === 'HOME' ? 'text-blue-500' : 'text-[#ff4655]'
                            }`}
                        >
                            {side} TEAM
                        </span>
                        {team.ready && (
                            <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded border border-green-500/30 uppercase font-bold">
                                Ready
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-[#1f2937] border border-gray-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4 gap-3">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Users size={18} className="text-[#ff4655]" />
                        Starting Five
                    </h3>

                    {canManage && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                                {selectedStarterIds.length}/5 selected
                            </span>
                            <button
                                onClick={onSaveStartingFive}
                                disabled={savingLineup || selectedStarterIds.length !== 5}
                                className="bg-[#ff4655] hover:bg-[#ff4655]/90 disabled:bg-gray-700 disabled:text-gray-400 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
                            >
                                {savingLineup ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                Save
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    {starters.map((member) => {
                        const rankInfo = getRankInfoFromString(member.currentRank);
                        const isSelected = selectedStarterIds.includes(member.id);
                        const isSubOutTarget = selectedStarterOutId === member.id;

                        return (
                            <div
                                key={member.id}
                                className={`bg-[#0f1923] p-3 rounded-lg border transition-all flex items-center gap-3 ${
                                    side === 'AWAY' ? 'xl:flex-row-reverse' : ''
                                } ${
                                    isSubOutTarget
                                        ? 'border-yellow-500 shadow-[0_0_0_1px_rgba(234,179,8,0.35)]'
                                        : isSelected
                                            ? 'border-green-500/40'
                                            : 'border-gray-700'
                                }`}
                            >
                                <div className="h-8 w-8 bg-gray-700 rounded-full flex items-center justify-center text-xs text-white font-bold shrink-0">
                                    {member.username.charAt(0).toUpperCase()}
                                </div>

                                <div className={`flex flex-col ${side === 'AWAY' ? 'xl:items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-gray-200 font-medium leading-none">
                                            {member.riotGameName || member.username}
                                        </span>
                                        {member.teamRole && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-600 text-gray-400 uppercase font-bold">
                                                {member.teamRole}
                                            </span>
                                        )}
                                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-green-500/30 text-green-400 uppercase font-bold">
                                            Starter
                                        </span>
                                    </div>

                                    {member.currentRank && member.currentRank !== 'Unranked' && rankInfo && (
                                        <span
                                            className={`text-[9px] pl-1 pr-1.5 py-0.5 mt-1 rounded border font-bold uppercase tracking-wider flex items-center gap-1 ${rankInfo.bg} ${rankInfo.color} ${rankInfo.border}`}
                                        >
                                            <img
                                                src={rankInfo.icon}
                                                alt={member.currentRank}
                                                className="w-3.5 h-3.5 object-contain"
                                            />
                                            {member.currentRank}
                                        </span>
                                    )}
                                </div>

                                <div className="flex-grow" />

                                {canManage && (
                                    <div className={`flex items-center gap-2 ${side === 'AWAY' ? 'xl:flex-row-reverse' : ''}`}>
                                        <button
                                            onClick={() => onToggleStarterSelection(member.id)}
                                            className={`text-xs px-2.5 py-1.5 rounded border font-bold transition-colors ${
                                                isSelected
                                                    ? 'border-green-500/40 text-green-400 bg-green-500/10'
                                                    : 'border-gray-600 text-gray-300 hover:bg-white/5'
                                            }`}
                                        >
                                            {isSelected ? 'Selected' : 'Select'}
                                        </button>

                                        <button
                                            onClick={() =>
                                                onSelectStarterOut(isSubOutTarget ? null : member.id)
                                            }
                                            className={`text-xs px-2.5 py-1.5 rounded border font-bold transition-colors flex items-center gap-1 ${
                                                isSubOutTarget
                                                    ? 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10'
                                                    : 'border-gray-600 text-gray-300 hover:bg-white/5'
                                            }`}
                                        >
                                            <Repeat size={12} />
                                            {isSubOutTarget ? 'Chosen' : 'Sub out'}
                                        </button>
                                    </div>
                                )}

                                {!canManage && member.ready && (
                                    <CheckCircle size={16} className="text-green-500" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-[#1f2937] border border-gray-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4 gap-3">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Users size={18} className="text-blue-400" />
                        Bench Members
                    </h3>

                    {canManage && selectedStarterOutId && (
                        <span className="text-xs text-yellow-400 font-medium">
                            Select a bench player to replace chosen starter
                        </span>
                    )}
                </div>

                {bench.length === 0 ? (
                    <div className="text-sm text-gray-500 bg-[#0f1923] rounded-lg border border-dashed border-gray-700 p-4">
                        No bench players.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {bench.map((member) => {
                            const rankInfo = getRankInfoFromString(member.currentRank);

                            return (
                                <div
                                    key={member.id}
                                    className={`bg-[#0f1923] p-3 rounded-lg border border-gray-700 flex items-center gap-3 ${
                                        side === 'AWAY' ? 'xl:flex-row-reverse' : ''
                                    }`}
                                >
                                    <div className="h-8 w-8 bg-gray-700 rounded-full flex items-center justify-center text-xs text-white font-bold shrink-0">
                                        {member.username.charAt(0).toUpperCase()}
                                    </div>

                                    <div className={`flex flex-col ${side === 'AWAY' ? 'xl:items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-gray-200 font-medium leading-none">
                                                {member.riotGameName || member.username}
                                            </span>
                                            {member.teamRole && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-600 text-gray-400 uppercase font-bold">
                                                    {member.teamRole}
                                                </span>
                                            )}
                                            <span className="text-[10px] px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-400 uppercase font-bold">
                                                Bench
                                            </span>
                                        </div>

                                        {member.currentRank && member.currentRank !== 'Unranked' && rankInfo && (
                                            <span
                                                className={`text-[9px] pl-1 pr-1.5 py-0.5 mt-1 rounded border font-bold uppercase tracking-wider flex items-center gap-1 ${rankInfo.bg} ${rankInfo.color} ${rankInfo.border}`}
                                            >
                                                <img
                                                    src={rankInfo.icon}
                                                    alt={member.currentRank}
                                                    className="w-3.5 h-3.5 object-contain"
                                                />
                                                {member.currentRank}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex-grow" />

                                    {canManage && selectedStarterOutId && (
                                        <button
                                            onClick={() => onSubstitute(member.id)}
                                            disabled={substituting}
                                            className="text-xs px-2.5 py-1.5 rounded border border-blue-500/40 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                                        >
                                            {substituting ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : (
                                                <Repeat size={12} />
                                            )}
                                            Sub in
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}