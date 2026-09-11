import apiClient from "./client";

export const getCatalogs = () =>
    apiClient.get("/test-templates/catalogs").then((r) => r.data.catalogs);

export const generateStandardTestSet = (machineId, catalogKey) =>
    apiClient.post("/test-templates/generate", { machine_id: machineId, catalog_key: catalogKey }).then((r) => r.data.tests);
