import { NavLink } from "react-router-dom";

function Sidebar() {
    const linkStyle = ({ isActive }) =>
        isActive
            ? "bg-blue-600 text-white p-3 rounded-lg block"
            : "text-gray-700 p-3 block hover:bg-gray-200 rounded-lg";

    return (
        <div className="w-64 bg-white shadow-md h-screen fixed p-5">
            <h1 className="text-2xl font-bold mb-8 text-blue-600">
                Face System
            </h1>

            <nav className="space-y-3">
                <NavLink to="/admin" className={linkStyle}>
                    Dashboard
                </NavLink>

                <NavLink to="/attendance" className={linkStyle}>
                    Attendance
                </NavLink>

                <NavLink to="/register" className={linkStyle}>
                    Register
                </NavLink>
            </nav>
        </div>
    );
}

export default Sidebar;