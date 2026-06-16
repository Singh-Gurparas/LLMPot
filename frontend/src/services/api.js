import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({ baseURL: API_BASE_URL });

// ── V1 ────────────────────────────────────────────────────────────────────────
export const getAnalyticsOverview = async () => (await api.get('/analytics/overview')).data;
export const getAttacks = async (params = {}) => (await api.get('/attacks', { params })).data;
export const getAttackDetails = async (id) => (await api.get(`/attacks/${id}`)).data;
export const getNodes = async () => (await api.get('/nodes')).data;
export const getSessionReplay = async (sessionId) => (await api.get(`/sessions/${sessionId}/replay`)).data;

// ── V2: Attacker Profiles ─────────────────────────────────────────────────────
export const getProfiles = async (params = {}) => (await api.get('/attacker-profiles/', { params })).data;
export const getProfileById = async (id) => (await api.get(`/attacker-profiles/${id}`)).data;
export const getProfileByIP = async (ip) => (await api.get(`/attacker-profiles/by-ip/${ip}`)).data;

// ── V2: Campaigns ─────────────────────────────────────────────────────────────
export const getCampaigns = async (params = {}) => (await api.get('/campaigns/', { params })).data;
export const getCampaignById = async (id) => (await api.get(`/campaigns/${id}`)).data;

// ── V2: Threat Reports ────────────────────────────────────────────────────────
export const getThreatReports = async (params = {}) => (await api.get('/threat-reports/', { params })).data;
export const getThreatReportById = async (id) => (await api.get(`/threat-reports/${id}`)).data;
export const getThreatReportBySession = async (sessionId) => (await api.get(`/threat-reports/session/${sessionId}`)).data;

// ── V2: MITRE ATT&CK ─────────────────────────────────────────────────────────
export const getMitreMappings = async (params = {}) => (await api.get('/mitre/', { params })).data;
export const getMitreSummary = async () => (await api.get('/mitre/summary')).data;
export const getMitreTactics = async () => (await api.get('/mitre/tactics')).data;

// ── V2: IOCs ──────────────────────────────────────────────────────────────────
export const getIOCs = async (params = {}) => (await api.get('/iocs/', { params })).data;
export const getIOCStats = async () => (await api.get('/iocs/stats')).data;
export const getTopIOCs = async (params = {}) => (await api.get('/iocs/top', { params })).data;

// ── V2: Predictions ───────────────────────────────────────────────────────────
export const getPredictions = async (params = {}) => (await api.get('/predictions/', { params })).data;

// ── V2: Mitigations ───────────────────────────────────────────────────────────
export const getMitigations = async (params = {}) => (await api.get('/mitigations/', { params })).data;
export const getMitigationById = async (id) => (await api.get(`/mitigations/${id}`)).data;
export const getSessionMitigation = async (sessionId) => (await api.get(`/mitigations/session/${sessionId}`)).data;

// ── V2: Deception Analytics ───────────────────────────────────────────────────
export const getDeceptionMetrics = async () => (await api.get('/deception/metrics')).data;
export const getDeceptionSummary = async () => (await api.get('/deception/summary')).data;
export const getDeceptionRecommendations = async () => (await api.get('/deception/recommendations')).data;

// ── V2: Session Analysis ──────────────────────────────────────────────────────
export const getSessionAnalysis = async (sessionId) => (await api.get(`/sessions/${sessionId}/analysis`)).data;
export const getSessionStory = async (sessionId) => (await api.get(`/sessions/${sessionId}/story`)).data;
export const getSessionMitre = async (sessionId) => (await api.get(`/sessions/${sessionId}/mitre`)).data;
export const triggerSessionAnalysis = async (sessionId) => (await api.post(`/sessions/${sessionId}/analyze`)).data;

export default api;
