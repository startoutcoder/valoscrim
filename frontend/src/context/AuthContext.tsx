import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/axios';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (token: string, refreshToken: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('access_token');
            if (token) {
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                try {
                    const response = await api.get('/users/me');
                    setUser(response.data);
                } catch (error) {
                    console.error("Session expired or invalid token", error);
                    localStorage.removeItem('access_token');
                    delete api.defaults.headers.common['Authorization'];
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);

    const login = async (accessToken: string, refreshToken: string) => {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);

        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

        try {
            const res = await api.get('/users/me');
            setUser(res.data);
        } catch (error) {
            console.error("Failed to fetch user profile on login", error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        window.location.href = '/login';
    };

    const refreshUser = async () => {
        try {
            const response = await api.get('/users/me');
            setUser(response.data);
        } catch (error) {
            console.error("Failed to refresh user data", error);
        }
    };

    return (
        <AuthContext.Provider value={{user, isLoading, login, logout, refreshUser}}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};