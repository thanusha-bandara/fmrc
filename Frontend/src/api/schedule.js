import apiClient from "./client";

export const getSchedules = () => apiClient.get("/schedule?_t=" + Date.now()).then((r) => r.data.schedules);

export const generateSchedule = () => apiClient.post("/schedule/generate").then((r) => r.data);
