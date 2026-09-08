import apiClient from "./client";

export const getSchedules = () => apiClient.get("/schedule").then((r) => r.data.schedules);

export const generateSchedule = () => apiClient.post("/schedule/generate").then((r) => r.data);
