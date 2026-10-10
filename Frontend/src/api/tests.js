import apiClient from "./client";

export const listTests = (params = {}) =>
    apiClient.get("/tests", { params }).then((r) => r.data.tests);

export const getTest = (id) => apiClient.get(`/tests/${id}`).then((r) => r.data.test);

export const createTest = (payload) =>
    apiClient.post("/tests", payload).then((r) => r.data.test);

export const saveTestData = (id, formData) =>
    apiClient.put(`/tests/${id}/data`, { formData }).then((r) => r.data.test);

export const submitTest = (id) => apiClient.post(`/tests/${id}/submit`).then((r) => r.data.test);

export const reviewTest = (id, recommendation, comments) =>
    apiClient.post(`/tests/${id}/review`, { recommendation, comments }).then((r) => r.data.test);

export const decideTest = (id, decision, comments) =>
    apiClient.post(`/tests/${id}/decide`, { decision, comments }).then((r) => r.data);

export const deleteTest = (id) => apiClient.delete(`/tests/${id}`).then((r) => r.data);

export const getTestEstimate = (id) =>
    apiClient.get(`/tests/${id}/estimate`).then((r) => r.data.estimate);

export const getStandaloneEstimate = (testName, isFieldTest = true) =>
    apiClient.get("/estimate", { params: { testName, isFieldTest } }).then((r) => r.data.estimate);

export const requestReschedule = (id, reason) =>
    apiClient.post(`/tests/${id}/request-reschedule`, { reason }).then((r) => r.data);

export const approveReschedule = (id) =>
    apiClient.post(`/tests/${id}/approve-reschedule`).then((r) => r.data);

