import apiClient from "./client";

export const listReports = () => apiClient.get("/reports").then((r) => r.data.reports);

export const listPendingReports = () => apiClient.get("/reports/pending").then((r) => r.data.reports);

export const decideReport = (reportId, decision, comments) =>
    apiClient.post(`/reports/${reportId}/decide`, { decision, comments }).then((r) => r.data.report);

export const getReportForTest = (testId) =>
    apiClient.get(`/reports/test/${testId}`).then((r) => r.data.report).catch(() => null);

// Opens the PDF inline in a new browser tab -- for a report still pending Chief Engineer
// approval, this is the only access a CE/Admin gets: a look, not a saved file (see
// viewReport vs downloadReport usage in ReportsForApproval.jsx).
export const viewReport = async (reportId) => {
    const response = await apiClient.get(`/reports/${reportId}/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    window.open(url, "_blank");
    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
};

// Downloads the PDF as a blob and triggers a save — the endpoint requires the
// Authorization header, so a plain <a href> link can't be used directly. Only offered once a
// report has been Approved (see ReportsForApproval.jsx) -- before that, use viewReport.
export const downloadReport = async (reportId) => {
    const response = await apiClient.get(`/reports/${reportId}/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `FMRC-Report-${reportId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};
