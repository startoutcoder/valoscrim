import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../api/axios';
import { Client } from '@stomp/stompjs';
import SockJS from "sockjs-client";
import { User, Shield, Key, Save, Loader2, Edit3, Gamepad2, Upload } from 'lucide-react';
import { useAuth } from "../../context/AuthContext.tsx";

interface UserProfileData {
    username: string;
    displayName: string;
    email: string;
    profilePicture: string;
    riotGameName: string;
    riotTagLine: string;
    teams: string[];
}

export default function UserProfile() {
    const { user, refreshUser } = useAuth();

    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'details' | 'security'>('details');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    const [riotId, setRiotId] = useState('');
    const [riotTag, setRiotTag] = useState('');
    const [isLinking, setIsLinking] = useState(false);

    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [passForm, setPassForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });


    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        if (!user?.id) return;

        const stompClient = new Client({
            webSocketFactory: () => new SockJS(import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws'),
            connectHeaders: {
                Authorization: `Bearer ${localStorage.getItem('access_token')}`
            },
            reconnectDelay: 5000,
            onConnect: () => {
                stompClient.subscribe(`/topic/user-${user.id}-profile`, (message) => {
                    if (message.body === 'SYNC_COMPLETE') {
                        fetchProfile();
                        refreshUser();
                        setMessage({ type: 'success', text: 'Riot Account fully synced!' });
                    }
                });
            }
        });

        stompClient.activate();

        return () => {
            stompClient.deactivate();
        };
    }, [user?.id]);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/users/me');
            setProfile(res.data);
            setDisplayName(res.data.displayName || res.data.username);
            setAvatarUrl(res.data.profilePicture);
        } catch (error) {
            console.error("Failed to load profile", error);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            setMessage({ type: 'error', text: 'Image must be less than 5MB.' });
            return;
        }

        setUploadingImage(true);
        setMessage(null);

        const formData = new FormData();
        formData.append('file', file);

        formData.append('upload_preset', 'valoscrim_uploadpresets');
        const cloudName = 'dxt7flfqw';

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (data.secure_url) {
                setAvatarUrl(data.secure_url);
                setMessage({ type: 'success', text: 'Image uploaded! Click Save Changes to update your profile.' });
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Failed to upload image. Please try again.' });
        } finally {
            setUploadingImage(false);
        }
    };

    const handleLinkRiot = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsLinking(true);

        try {
            const res = await api.post('/users/me/riot-account', {
                riotId: riotId,
                tagLine: riotTag
            });
            setProfile(res.data);
            setMessage({ type: 'success', text: 'Riot Account successfully linked!' });
            setRiotId('');
            setRiotTag('');
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.message || "Failed to link account. Check your ID and Tag." });
        } finally {
            setIsLinking(false);
        }
    }

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        try {
            if (displayName !== profile?.displayName) {
                await api.put('/users/me/display-name', { newDisplayName: displayName });
            }
            if (avatarUrl !== profile?.profilePicture) {
                await api.put('/users/me/profile-picture', { imageUrl: avatarUrl });
            }
            setMessage({ type: 'success', text: 'Profile updated successfully!' });

            fetchProfile();
            await refreshUser();
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update profile.' });
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (passForm.newPassword !== passForm.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        try {
            await api.put('/users/me/password', {
                currentPassword: passForm.currentPassword,
                newPassword: passForm.newPassword
            });

            setMessage({ type: 'success', text: 'Password changed successfully.' });
            setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            setMessage({ type: 'error', text: 'Failed to update password. Check your current password.' });
        }
    };

    const triggerRelink = () => {
        if (profile) {
            setProfile({ ...profile, riotGameName: '', riotTagLine: '' });
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-[#ff4655]" /></div>;
    if (!profile) return <div className="text-white text-center p-20">Failed to load profile.</div>;

    return (
        <div className="max-w-4xl mx-auto pb-20 space-y-8">
            <div className="bg-[#1f2937] border border-gray-700 rounded-xl p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-[#ff4655]" />
                <img src={profile.profilePicture} alt="Profile" className="w-32 h-32 rounded-full border-4 border-[#ff4655]/20 bg-[#0f1923] object-cover" />
                <div className="text-center md:text-left space-y-2 flex-1">
                    <h1 className="text-3xl font-bold text-white">{profile.displayName}</h1>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        {profile.riotGameName && (
                            <span className="bg-[#ff4655]/10 text-[#ff4655] border border-[#ff4655]/20 px-3 py-1 rounded text-sm font-bold">
                                {profile.riotGameName} #{profile.riotTagLine}
                            </span>
                        )}
                        <span className="bg-gray-700/50 text-gray-300 border border-gray-600 px-3 py-1 rounded text-sm flex items-center gap-2">
                            <Shield size={14} /> {profile.teams?.length || 0} Teams
                        </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-1">Login ID: @{profile.username}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

                <div className="md:col-span-1 space-y-2">
                    <button onClick={() => setActiveTab('details')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'details' ? 'bg-[#ff4655] text-white font-bold shadow-lg shadow-red-900/20' : 'text-gray-400 hover:bg-[#1f2937] hover:text-white'}`}><User size={18} /> General</button>
                    <button onClick={() => setActiveTab('security')} className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'security' ? 'bg-[#ff4655] text-white font-bold shadow-lg shadow-red-900/20' : 'text-gray-400 hover:bg-[#1f2937] hover:text-white'}`}><Key size={18} /> Security</button>
                </div>

                <div className="md:col-span-3 bg-[#1f2937] border border-gray-700 rounded-xl p-8 min-h-[400px]">
                    {message && <div className={`mb-6 p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500'}`}>{message.text}</div>}

                    {activeTab === 'details' ? (
                        <div className="space-y-10">
                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Edit3 className="text-[#ff4655]" /> Edit Profile</h2>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Display Name</label>
                                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full bg-[#0f1923] border border-gray-600 rounded-lg p-3 text-white focus:border-[#ff4655] outline-none transition-colors" required minLength={3} maxLength={20} />
                                    <p className="text-xs text-gray-500 mt-1">This is your public name seen by other players.</p>
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Profile Picture</label>
                                    <div className="flex items-center gap-4">
                                        <img
                                            src={avatarUrl}
                                            alt="Avatar Preview"
                                            className="w-16 h-16 rounded-full border-2 border-gray-600 object-cover bg-gray-800"
                                        />

                                        <input
                                            type="file"
                                            accept="image/jpeg, image/png, image/webp"
                                            ref={fileInputRef}
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingImage}
                                            className="bg-[#0f1923] border border-gray-600 hover:border-[#ff4655] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {uploadingImage ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                            {uploadingImage ? 'Uploading...' : 'Choose Image'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">JPG, PNG, or WEBP. Max size 5MB.</p>
                                </div>

                                <div className="pt-2">
                                    <button type="submit" className="bg-[#ff4655] hover:bg-[#ff4655]/90 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-red-900/20">
                                        <Save size={18} /> Save Changes
                                    </button>
                                </div>
                            </form>

                            <div className="pt-8 border-t border-gray-700">
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Gamepad2 className="text-[#ff4655]" /> Game Integration</h2>

                                {profile.riotGameName ? (
                                    <div className="bg-[#0f1923] border border-gray-600 rounded-lg p-5 flex justify-between items-center">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">Linked Riot Account</p>
                                            <p className="text-xl font-bold text-white">{profile.riotGameName} <span className="text-gray-500 text-sm">#{profile.riotTagLine}</span></p>
                                        </div>
                                        <button onClick={triggerRelink} className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-4 rounded transition-colors">
                                            Change Account
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleLinkRiot} className="bg-[#0f1923] border border-gray-600 rounded-lg p-5 space-y-4">
                                        <p className="text-sm text-gray-400">Link your Valorant account to enable matchmaking and rank syncing.</p>
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-gray-400 text-xs uppercase mb-1">Riot ID</label>
                                                <input
                                                    type="text"
                                                    value={riotId}
                                                    onChange={e => setRiotId(e.target.value)}
                                                    placeholder="e.g. TenZ"
                                                    className="w-full bg-[#1f2937] border border-gray-600 rounded p-3 text-white outline-none focus:border-[#ff4655] transition-colors"
                                                    required
                                                />
                                            </div>
                                            <div className="w-1/3">
                                                <label className="block text-gray-400 text-xs uppercase mb-1">Tagline</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">#</span>
                                                    <input
                                                        type="text"
                                                        value={riotTag}
                                                        onChange={e => setRiotTag(e.target.value)}
                                                        placeholder="SEN"
                                                        className="w-full bg-[#1f2937] border border-gray-600 rounded p-3 pl-8 text-white outline-none focus:border-[#ff4655] transition-colors"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!riotId || !riotTag || isLinking}
                                            className="w-full bg-[#ff4655] hover:bg-[#ff4655]/90 text-white font-bold py-3 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center gap-2"
                                        >
                                            {isLinking ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Link Account'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleChangePassword} className="space-y-6">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Key className="text-[#ff4655]" /> Change Password</h2>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Current Password</label>
                                <input type="password" value={passForm.currentPassword} onChange={(e) => setPassForm({...passForm, currentPassword: e.target.value})} className="w-full bg-[#0f1923] border border-gray-600 rounded-lg p-3 text-white focus:border-[#ff4655] outline-none transition-colors" required />
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">New Password</label>
                                <input type="password" value={passForm.newPassword} onChange={(e) => setPassForm({...passForm, newPassword: e.target.value})} className="w-full bg-[#0f1923] border border-gray-600 rounded-lg p-3 text-white focus:border-[#ff4655] outline-none transition-colors" required minLength={6} />
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passForm.confirmPassword}
                                    onChange={(e) => setPassForm({...passForm, confirmPassword: e.target.value})}
                                    className={`w-full bg-[#0f1923] border rounded-lg p-3 text-white focus:outline-none transition-colors ${
                                        passForm.confirmPassword && passForm.newPassword !== passForm.confirmPassword
                                            ? 'border-red-500 focus:border-red-500'
                                            : 'border-gray-600 focus:border-[#ff4655]'
                                    }`}
                                    required
                                    minLength={6}
                                />
                                {passForm.confirmPassword && passForm.newPassword !== passForm.confirmPassword && (
                                    <p className="text-red-500 text-xs mt-1">Passwords do not match.</p>
                                )}
                            </div>

                            <div className="pt-4 border-t border-gray-700">
                                <button type="submit" className="bg-[#ff4655] hover:bg-[#ff4655]/90 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-all"><Save size={18} /> Update Password</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}