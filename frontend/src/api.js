import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3114';
const api = axios.create({ baseURL: baseURL + '/api' });

export const API_BASE_URL = baseURL;

// Add auth token to requests + cache-busting for GET
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (config.method === 'get') {
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
    config.params = config.params || {};
    config.params._t = new Date().getTime();
  }

  return config;
});

// ── Auth ──
export const login = async (employee_input, password) => {
  const { data } = await api.post('/auth/login', { employee_input, password });
  return data;
};

// ── Lines ──
export const getLines = () => api.get('/lines').then(r => r.data);

// ── Machines ──
export const getMachines = (line_id) => {
  const params = line_id ? { line_id } : {};
  return api.get('/machines', { params }).then(r => r.data);
};

// ── Tasks ──
export const getTasks = (params = {}) => api.get('/tasks', { params }).then(r => r.data);
export const createTask = (payload) => api.post('/tasks', payload).then(r => r.data);
export const createTasksBulk = (tasks) => api.post('/tasks/bulk', { tasks }).then(r => r.data);
export const updateTask = (id, payload) => api.put(`/tasks/${id}`, payload).then(r => r.data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`).then(r => r.data);

// ── Maintenance ──
export const getCurrentCycle = () => api.get('/maintenance/current-cycle').then(r => r.data);
export const getChecklist = (lineId) => api.get(`/maintenance/checklist/${lineId}`).then(r => r.data);
export const createRecord = (line_id) => api.post('/maintenance/records', { line_id }).then(r => r.data);
export const completeTask = (recordId, taskId, completed, notes) =>
  api.post(`/maintenance/records/${recordId}/tasks/${taskId}/complete`, { completed, notes }).then(r => r.data);

export const uploadPhoto = (recordId, taskId, photoType, file) => {
  const formData = new FormData();
  formData.append('photo', file);
  return api.post(`/maintenance/records/${recordId}/tasks/${taskId}/photo/${photoType}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);
};

// ── Records (history) ──
export const getRecords = (params = {}) => api.get('/maintenance/records', { params }).then(r => r.data);
export const getRecordDetail = (id) => api.get(`/maintenance/records/${id}`).then(r => r.data);
export const completeRecord = (id) => api.put(`/maintenance/records/${id}/complete`).then(r => r.data);

// ── Config ──
export const getConfig = () => api.get('/config').then(r => r.data);
export const updateConfig = (key, value) => api.put(`/config/${key}`, { value }).then(r => r.data);

// ── Admin: Lines ──
export const createLine = (payload) => api.post('/lines', payload).then(r => r.data);
export const updateLine = (id, payload) => api.put(`/lines/${id}`, payload).then(r => r.data);
export const deleteLine = (id) => api.delete(`/lines/${id}`).then(r => r.data);

// ── Admin: Machines ──
export const createMachine = (payload) => api.post('/machines', payload).then(r => r.data);
export const updateMachine = (id, payload) => api.put(`/machines/${id}`, payload).then(r => r.data);
export const deleteMachine = (id) => api.delete(`/machines/${id}`).then(r => r.data);

export default api;
