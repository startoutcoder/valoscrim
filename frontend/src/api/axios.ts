import axios from 'axios';

const API_URL = import.meta.env.BASE_URL || 'http://localhost:8080/api';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});


api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');

        console.groupCollapsed(`[Axios Request] ${config.method?.toUpperCase()} ${config.url}`);

        if (token) {
            console.log("Token found in Storage:", token.substring(0, 10) + "...");
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            console.warn("No Access Token found in localStorage! Request sent anonymously.");
        }
        console.groupEnd();

        return config;
    },
    (error) => {
        console.error("[Axios Request Error]", error);
        return Promise.reject(error);
    }
);


api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        console.group(`[Axios Error] ${error.response?.status} on ${originalRequest?.url}`);
        console.error("Message:", error.message);

        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            console.warn("🔄 401 detected. Attempting Token Refresh...");

            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (!refreshToken) {
                    console.error("No refresh token found. Aborting.");
                    throw new Error('No refresh token');
                }

                console.log("Sending refresh request...");
                const response = await axios.post(`${API_URL}/auth/refresh-token`, {}, {
                    headers: { Authorization: `Bearer ${refreshToken}` }
                });

                const { access_token, refresh_token: newRefreshToken } = response.data;

                console.log("Refresh Successful! Updating Storage.");
                localStorage.setItem('access_token', access_token);
                localStorage.setItem('refresh_token', newRefreshToken);

                originalRequest.headers.Authorization = `Bearer ${access_token}`;

                console.log("Re-issuing original request with new token...");
                console.groupEnd();

                return api(originalRequest);

            } catch (refreshError) {
                console.error("Refresh Failed. Logging out user.", refreshError);
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';

                console.groupEnd();
                return Promise.reject(refreshError);
            }
        }

        if (originalRequest?._retry && error.response?.status === 403) {
            console.error("Request failed after refresh due to permissions, not token expiration.");
        }

        console.groupEnd();
        return Promise.reject(error);
    }
);