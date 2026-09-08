// The backend stores full role names (RBAC enum); the frontend UI/routing has always
// used short codes. This is the single place that maps between the two.
export const BACKEND_TO_SHORT = {
    Admin: "ADMIN",
    Technical_Assistant: "TA",
    Mechanical_Engineer: "ME",
    Chief_Engineer: "CE"
};

export const SHORT_TO_BACKEND = {
    ADMIN: "Admin",
    TA: "Technical_Assistant",
    ME: "Mechanical_Engineer",
    CE: "Chief_Engineer"
};

export const toShortRole = (backendRole) => BACKEND_TO_SHORT[backendRole] || "TA";
export const toBackendRole = (shortRole) => SHORT_TO_BACKEND[shortRole] || "Technical_Assistant";
