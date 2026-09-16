import apiClient from "./client";

export const listLabours = () => apiClient.get("/labours").then((r) => r.data.labours);

export const createLabour = (name) => apiClient.post("/labours", { name }).then((r) => r.data.labour);

export const updateLabour = (id, name, is_active) => apiClient.put(`/labours/${id}`, { name, is_active }).then((r) => r.data);

export const deleteLabour = (id) => apiClient.delete(`/labours/${id}`).then((r) => r.data);

export const listLabourAvailability = () => apiClient.get("/labours/availability").then((r) => r.data.availability);

export const setLabourAvailability = (data) => apiClient.post("/labours/availability", data).then((r) => r.data.availability);
