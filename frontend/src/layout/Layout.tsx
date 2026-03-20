import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { LogOut, User as UserIcon, Shield, Swords, LayoutDashboard } from 'lucide-react';
import clsx from 'clsx';

export default function Layout() {
    const { user, logout } = useAuth();
    const location = useLocation();

    const navItems = [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Find Scrims', href: '/matches', icon: Swords },
        { label: 'My Team', href: '/team', icon: Shield },
        { label: 'Profile', href: user ? `/profile/${user.username}` : '#', icon: UserIcon },
    ];

    const profileUrl = user ? `/profile/${user.username}` : '#';

    return (
        <div className="min-h-screen bg-[#0f1923] text-gray-100 font-sans">
            <nav className="h-16 border-b border-white/10 bg-[#1f2937]/50 backdrop-blur-md fixed top-0 w-full z-50 px-6 flex items-center justify-between">

                <div className="flex items-center gap-2">
                    <Link
                        to="/dashboard"
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                    <span className="text-2xl font-black tracking-tighter text-white">
                        VALO<span className="text-[#ff4655]">SCRIM</span>
                    </span>
                    </Link>
                </div>

                <div className="hidden md:flex items-center gap-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={clsx(
                                    "px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all",
                                    isActive
                                        ? "bg-[#ff4655] text-white"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <Icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                <div className="flex items-center gap-4">
                    <Link
                        to={profileUrl}
                        className="flex items-center gap-3 hover:bg-white/5 px-2 py-1 rounded-lg transition-all group"
                    >
                        <span className="text-sm font-medium text-gray-300 hidden sm:block group-hover:text-white transition-colors">
                            {user?.displayName || user?.riotGameName}
                        </span>
                        <img
                            src={user?.profilePicture}
                            alt="Profile"
                            className="h-9 w-9 rounded-full border border-gray-600 bg-gray-800 object-cover group-hover:border-[#ff4655] transition-colors"
                        />
                    </Link>

                    <button
                        onClick={logout}
                        className="p-2 text-gray-400 hover:text-[#ff4655] transition-colors"
                        title="Sign Out"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </nav>

            <main className="pt-20 px-6 max-w-7xl mx-auto">
                <Outlet />
            </main>
        </div>
    );
}