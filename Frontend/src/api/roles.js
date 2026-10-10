export const BACKEND_TO_SHORT = {
    Admin: "ADMIN",
    Technical_Assistant: "TA",
    Agriculture_Instructor: "AI",
    Mechanical_Engineer: "ME",
    Chief_Engineer: "CE"
};

export const SHORT_TO_BACKEND = {
    ADMIN: "Admin",
    TA: "Technical_Assistant",
    AI: "Agriculture_Instructor",
    ME: "Mechanical_Engineer",
    CE: "Chief_Engineer"
};

export const toShortRole = (backendRole) => BACKEND_TO_SHORT[backendRole] || "TA";
export const toBackendRole = (shortRole) => SHORT_TO_BACKEND[shortRole] || "Technical_Assistant";
