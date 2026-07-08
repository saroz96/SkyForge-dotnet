// // src/services/auditApi.js
// import apiClient from './api';

// export const auditApi = {
//   getLogs: (params) => 
//     apiClient.get('/api/audit/logs', { params }),

//   getMyLogs: (params) => 
//     apiClient.get('/api/audit/my-logs', { params }),

//   getEntityLogs: (entityType, entityId) =>
//     apiClient.get(`/api/audit/entity/${entityType}/${entityId}`),

//   getSummary: (params) =>
//     apiClient.get('/api/audit/summary', { params }),
// };

//-----------------------------------------------------------------------------end

// src/services/auditApi.js
import apiClient from './api';

export const auditApi = {
  getLogs: (params) => 
    apiClient.get('/api/audit/logs', { params }),

  getMyLogs: (params) => 
    apiClient.get('/api/audit/my-logs', { params }),

  getEntityLogs: (entityType, entityId) =>
    apiClient.get(`/api/audit/entity/${entityType}/${entityId}`),

  getSummary: (params) =>
    apiClient.get('/api/audit/summary', { params }),

  getCount: () =>
    apiClient.get('/api/audit/count'),

  cleanup: (maxRecords = 5000, retentionDays = 30) =>
    apiClient.post('/api/audit/cleanup', null, { params: { maxRecords, retentionDays } }),
};