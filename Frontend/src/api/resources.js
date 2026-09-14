import apiClient from "./client";

// Fields
export const listFields = () => apiClient.get("/resources/fields").then((r) => r.data.fields);
export const addField = (payload) => apiClient.post("/resources/fields", payload).then((r) => r.data.field);
export const updateField = (id, payload) => apiClient.put(`/resources/fields/${id}`, payload).then((r) => r.data.field);
export const deleteField = (id) => apiClient.delete(`/resources/fields/${id}`).then((r) => r.data);

// Staff (human) availability
export const listStaffAvailability = (params = {}) =>
    apiClient.get("/resources/staff-availability", { params }).then((r) => r.data.records);
export const setStaffAvailability = (payload) =>
    apiClient.post("/resources/staff-availability", payload).then((r) => r.data.record);
export const deleteStaffAvailability = (id) =>
    apiClient.delete(`/resources/staff-availability/${id}`).then((r) => r.data);

// Labour availability
export const listLabourAvailability = (params = {}) =>
    apiClient.get("/resources/labour-availability", { params }).then((r) => r.data.records);
export const setLabourAvailability = (payload) =>
    apiClient.post("/resources/labour-availability", payload).then((r) => r.data.record);
export const deleteLabourAvailability = (id) =>
    apiClient.delete(`/resources/labour-availability/${id}`).then((r) => r.data);

// Weather
export const listWeatherLogs = () => apiClient.get("/weather").then((r) => r.data.logs);
export const setManualWeather = (date, isRainy) =>
    apiClient.post("/weather/manual", { date, isRainy }).then((r) => r.data);
export const refreshWeather = () => apiClient.post("/weather/refresh").then((r) => r.data.rainyDates);

// Calendar / holidays
export const listHolidays = () => apiClient.get("/calendar").then((r) => r.data.holidays);
export const markHoliday = (date, reason) =>
    apiClient.post("/calendar/holiday", { date, reason }).then((r) => r.data);
export const removeHoliday = (id) => apiClient.delete(`/calendar/holiday/${id}`).then((r) => r.data);
