import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL?.includes('localhost') 
    ? `http://${window.location.hostname}:3000/api` 
    : (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000/api`);

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" }
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("userRole");
            localStorage.removeItem("userName");
            localStorage.removeItem("userId");
            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

// Pulls a readable message out of a backend error response, falling back to a generic string.
export const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
    return error?.response?.data?.message || error?.message || fallback;
};

export default apiClient;
