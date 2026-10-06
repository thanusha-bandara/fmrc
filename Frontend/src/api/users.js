import apiClient from "./client";

export const listUsers = (role) =>
    apiClient.get("/users", { params: role ? { role } : {} }).then((r) => r.data.users);

export const registerUser = (payload) =>
    apiClient.post("/users/register", payload).then((r) => r.data.user);

export const updateUser = (id, payload) =>
    apiClient.put(`/users/${id}`, payload).then((r) => r.data.user);

export const deactivateUser = (id) =>
    apiClient.put(`/users/${id}/deactivate`).then((r) => r.data.user);

export const listPasswordResetRequests = () =>
    apiClient.get("/users/password-reset-requests").then((r) => r.data.requests);

export const setUserPassword = (id, newPassword) =>
    apiClient.put(`/users/${id}/password`, { newPassword }).then((r) => r.data);

export const deleteUser =(id) => apiClient.delete(`/users/${id}`).then((r) => r.data);
