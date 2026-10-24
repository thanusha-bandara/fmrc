import apiClient from "./client";

export const listMachinery = () => apiClient.get("/machinery").then((r) => r.data.machines);

export const getMachine = (id) => apiClient.get(`/machinery/${id}`).then((r) => r.data.machine);

export const registerMachine = (payload) =>
    apiClient.post("/machinery", payload).then((r) => r.data.machine);

export const updateMachine = (id, payload) =>
    apiClient.put(`/machinery/${id}`, payload).then((r) => r.data.machine);

export const deleteMachine = (id) => apiClient.delete(`/machinery/${id}`).then((r) => r.data);

export const getFinalizeStatus = (machineId) =>
    apiClient.get(`/machinery/${machineId}/finalize-status`).then((r) => r.data.status);

export const finalizeReport = (machineId, selections) =>
    apiClient.post(`/machinery/${machineId}/finalize-report`, { selections }).then((r) => r.data);

export const toggleHoldMachine = (id, isOnHold, holdReason = "") =>
    apiClient.post(`/machinery/${id}/hold`, { is_on_hold: isOnHold, hold_reason: holdReason }).then((r) => r.data);
