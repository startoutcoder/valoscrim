

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
}

export interface Team {
    id: number;
    name: string;
    tag: string;
    wins: number;
    losses: number;
    ownerId: number;
    averageTierId: number;
    members: TeamMember[];
}

export interface TeamMember {
    userId: number;
    username: string;
    displayName?: string;
    role: 'OWNER' | 'CAPTAIN' | 'MEMBER';
    position: 'DUELIST' | 'CONTROLLER' | 'INITIATOR' | 'SENTINEL' | 'FLEX';
}

export interface User {
    id: number;
    username: string;
    displayName?: string;
    email: string;
    riotGameName?: string;
    riotTagLine?: string;
    profilePicture?: string;
    teams?: TeamSummary[];
}

export interface TeamSummary {
    id: number;
    name: string;
    tag: string;
}
