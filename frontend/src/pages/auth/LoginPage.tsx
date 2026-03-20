import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/axios';
import { Lock, Mail, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', { username, password });

            await login(response.data.access_token, response.data.refresh_token);

            navigate('/dashboard');
        } catch (err: any) {
            console.error('LOGIN ERROR URL:', err.config?.url);
            console.error('LOGIN ERROR STATUS:', err.response?.status);
            console.error('LOGIN ERROR DATA:', err.response?.data);
            setError(err.response?.data?.message || 'Invalid username or password');
        }
        finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f1923] text-white p-4">
            <div className="w-full max-w-md bg-[#1f2937] p-8 rounded-xl shadow-2xl border border-gray-700">

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-[#ff4655] mb-2">VALOSCRIM</h1>
                    <p className="text-gray-400">Welcome back, Agent.</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[#0f1923] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#ff4655] focus:ring-1 focus:ring-[#ff4655] transition-colors"
                                placeholder="Enter your username"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#0f1923] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#ff4655] focus:ring-1 focus:ring-[#ff4655] transition-colors"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#ff4655] hover:bg-[#ff4655]/90 text-white font-bold py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center"
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'SIGN IN'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-400">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-[#ff4655] hover:underline">
                        Join the protocol
                    </Link>
                </div>
            </div>
        </div>
    );
}