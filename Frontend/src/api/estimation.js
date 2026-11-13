import apiClient from "./client";

export const getEstimations = (limit = 8) =>
    apiClient.get(`/estimation?limit=${limit}`).then((r) => r.data.estimations);

export const getMachineEstimation = (machineId) =>
    apiClient.get(`/estimation/machine/${machineId}`).then((r) => r.data.estimation);

export const calculateEstimation = (payload) =>
    apiClient.post("/estimation/calculate", payload).then((r) => r.data.estimation);
