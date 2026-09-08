import apiClient from "./client";

export const listReports = () => apiClient.get("/reports").then((r) => r.data.reports);

export const getReportForTest = (testId) =>
    apiClient.get(`/reports/test/${testId}`).then((r) => r.data.report).catch(() => null);

// Downloads the PDF as a blob and triggers a save — the endpoint requires the
// Authorization header, so a plain <a href> link can't be used directly.
export const downloadReport = async (reportId) => {
    const response = await apiClient.get(`/reports/${reportId}/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `FMRC-Report-${reportId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};
