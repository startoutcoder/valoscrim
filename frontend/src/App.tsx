import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute.tsx';
import Layout from './layout/Layout.tsx';

import LoginPage from './pages/auth/LoginPage.tsx';
import RegisterPage from './pages/auth/RegisterPage.tsx';

import Dashboard from './pages/dashboard/Dashboard.tsx';
import UserProfile from "./pages/user/UserProfile.tsx";

import TeamPage from "./pages/team/TeamPage.tsx";
import CreateTeam from "./pages/team/CreateTeam.tsx";
import FindTeam from "./pages/team/FindTeam.tsx";
import TeamProfile from "./pages/team/TeamProfile.tsx";

import MatchList from "./matches/MatchList.tsx";
import CreateMatchFAB from "./matches/CreateMatchFAB.tsx";
import MatchLobby from "./pages/matches/MatchLobby.tsx";

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <CreateMatchFAB/>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    <Route element={<ProtectedRoute />}>
                        <Route element={<Layout />}>
                            <Route path="/dashboard" element={<Dashboard />} />

                            <Route path="/profile/:username" element={<UserProfile />} />
                            <Route path="/team" element={<TeamPage />} />
                            <Route path="/team/create" element={<CreateTeam />} />
                            <Route path="/team/find" element={<FindTeam />} />
                            <Route path="/team/:teamId" element={<TeamProfile />} />

                            <Route path="/matches" element={<MatchList />} />
                            <Route path="/match/:matchId" element={<MatchLobby />} />
                        </Route>
                    </Route>

                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;