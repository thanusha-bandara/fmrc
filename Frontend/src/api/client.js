import axios from "axios";
import { db } from "../db/offlineDB";

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
    async (error) => {
        if (!error.response || error.code === 'ERR_NETWORK') {
            const config = error.config;
            
            // Do not intercept authentication requests (login, etc)
            if (config && config.url && config.url.includes('/auth/')) {
                return Promise.reject(new Error("Internet connection is required to login."));
            }

            if (config && ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase()) && !config.__isSync) {
                try {
                    await db.syncQueue.add({
                        url: config.url,
                        method: config.method,
                        body: config.data,
                        headers: config.headers,
                        timestamp: Date.now()
                    });
                    
                    window.dispatchEvent(new Event('offline-data-added'));

                    return Promise.resolve({
                        status: 200,
                        data: { message: "Saved offline. Will sync when online.", offline: true }
                    });
                } catch (dbError) {
                    console.error("Failed to save offline data", dbError);
                }
            }
        }

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
