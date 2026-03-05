import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

export const getAnalyticsOverview = async () => {
    const res = await api.get('/analytics/overview');
    return res.data;
};

export const getAttacks = async (params = {}) => {
    const res = await api.get('/attacks', { params });
    return res.data;
};

export const getAttackDetails = async (id) => {
    const res = await api.get(`/attacks/${id}`);
    return res.data;
};

export const getNodes = async () => {
    const res = await api.get('/nodes');
    return res.data;
};

export const getSessionReplay = async (sessionId) => {
    const res = await api.get(`/sessions/${sessionId}/replay`);
    return res.data;
};

export default api;
