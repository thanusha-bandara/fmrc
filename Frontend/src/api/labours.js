import apiClient from "./client";

export const listLabours = () => apiClient.get("/labours").then((r) => r.data.labours);

export const addLabour = (payload) =>
    apiClient.post("/labours", payload).then((r) => r.data.labour);

export const updateLabour = (id, payload) =>
    apiClient.put(`/labours/${id}`, payload).then((r) => r.data.labour);

export const deactivateLabour = (id) =>
    apiClient.put(`/labours/${id}/deactivate`).then((r) => r.data.labour);

export const deleteLabour = (id) => apiClient.delete(`/labours/${id}`).then((r) => r.data);
