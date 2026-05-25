import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute – redirects unauthenticated users back to login.
 * Auth is checked via the presence of `auth_token` in localStorage.
 * Swap this for a proper JWT validation / context check in production.
 */
function ProtectedRoute({ children }) {
    const token = localStorage.getItem("auth_token");

    if (!token) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedRoute;
