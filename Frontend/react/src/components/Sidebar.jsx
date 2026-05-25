import { NavLink, useNavigate } from "react-router-dom";
import { 
    FiGrid, 
    FiUsers, 
    FiCamera, 
    FiActivity, 
    FiClock, 
    FiSettings, 
    FiLogOut 
} from "react-icons/fi";

function Sidebar() {
    const navigate = useNavigate();
    
    const menuItems = [
        { name: "Dashboard", path: "/admin", icon: <FiGrid className="w-5 h-5" /> },
        { name: "Employees", path: "/admin/employees", icon: <FiUsers className="w-5 h-5" /> },
        { name: "Register Face", path: "/admin/register-face", icon: <FiCamera className="w-5 h-5" /> },
        { name: "Live Attendance", path: "/admin/live-attendance", icon: <FiActivity className="w-5 h-5" /> },
        { name: "History Logs", path: "/admin/history", icon: <FiClock className="w-5 h-5" /> },
        { name: "Settings", path: "/admin/settings", icon: <FiSettings className="w-5 h-5" /> },
    ];

    const handleLogout = () => {
        localStorage.removeItem("auth_token");
        navigate("/");
    };

    return (
        <div className="w-64 glass-panel border-r border-slate-800/80 h-screen fixed top-0 left-0 flex flex-col justify-between p-6 z-20">
            <div>
                {/* Logo Section */}
                <div className="flex items-center gap-3 mb-8 px-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
                        F
                    </div>
                    <div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                            FaceBio
                        </h1>
                        <span className="text-[10px] text-indigo-400 font-medium tracking-wider uppercase">
                            Attendance System
                        </span>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="space-y-1.5">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === "/admin"}
                            className={({ isActive }) =>
                                `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    isActive
                                        ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-indigo-300 border-l-4 border-indigo-500 pl-3"
                                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                                }`
                            }
                        >
                            {item.icon}
                            <span>{item.name}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Logout Footer */}
            <div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 transition-all duration-200"
                >
                    <FiLogOut className="w-5 h-5" />
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
}

export default Sidebar;