import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../src/context/AuthContext.tsx';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0f1923] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#ff4655] h-12 w-12" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};