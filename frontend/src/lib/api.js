import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
    baseURL: API_BASE,
    timeout: 20000,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('fw_token');
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err?.response?.status === 401) {
            const path = window.location.pathname;
            if (path !== '/login') {
                localStorage.removeItem('fw_token');
                localStorage.removeItem('fw_user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(err);
    },
);

export default api;
