import apiClient from "./client";

export const login = (username, password) =>
    apiClient.post("/users/login", { username, password }).then((r) => r.data);

export const getMe = () => apiClient.get("/users/me").then((r) => r.data.user);

export const updateMyProfile = (payload) =>
    apiClient.put("/users/me", payload).then((r) => r.data.user);

export const changeMyPassword = (currentPassword, newPassword) =>
    apiClient.put("/users/me/password", { currentPassword, newPassword }).then((r) => r.data);

export const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    localStorage.removeItem("userId");
};
