import apiClient from "./client";

export const getTestSchema = (testId) =>
    apiClient.get(`/test-schema/${testId}`).then((r) => r.data.schema);
