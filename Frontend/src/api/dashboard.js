import apiClient from "./client";

export const getDashboardSummary = () =>
    apiClient.get("/dashboard/summary").then((r) => r.data.summary);
