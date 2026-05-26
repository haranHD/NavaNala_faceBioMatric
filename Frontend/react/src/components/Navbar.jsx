import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { FiCalendar, FiClock, FiBell, FiUser } from "react-icons/fi";
import ThemeToggle from "./ThemeToggle";

function Navbar() {
    const location = useLocation();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Get current page title dynamically
    const getPageTitle = () => {
        switch (location.pathname) {
            case "/admin":
                return "Dashboard Overview";
            case "/admin/employees":
                return "Employee Management";
            case "/admin/register-face":
                return "Face Enrollment";
            case "/admin/live-attendance":
                return "Live Attendance Feed";
            case "/admin/history":
                return "Attendance Logs";
            case "/admin/permissions":
                return "Permission Management";
            case "/admin/settings":
                return "System Settings";
            default:
                return "FaceBio Attendance";
        }
    };

    const formatDate = (date) => {
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    return (
        <div className="glass-panel border-b theme-divider px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-2xl mb-6">
            {/* Title Section */}
            <div>
                <h1 className="text-xl font-bold theme-heading">
                    {getPageTitle()}
                </h1>
                <p className="text-xs theme-muted mt-0.5">
                    Real-time Face Biometric Tracking
                </p>
            </div>

            {/* Time, Notifications & Profile */}
            <div className="flex flex-wrap items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                {/* Date & Time display */}
                <div className="flex items-center gap-4 theme-text text-sm theme-surface px-4 py-2 rounded-xl">
                    <div className="flex items-center gap-1.5 border-r theme-divider pr-3">
                        <FiCalendar className="text-indigo-400" />
                        <span>{formatDate(time)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <FiClock className="text-purple-400" />
                        <span className="font-mono">{formatTime(time)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <ThemeToggle compact />

                    {/* Notifications bell */}
                    <button className="w-10 h-10 rounded-xl theme-toggle-btn flex items-center justify-center transition-colors relative">
                        <FiBell className="w-5 h-5" />
                        <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-slate-900"></span>
                    </button>

                    {/* Divider */}
                    <div className="w-px h-6 theme-divider bg-[var(--divider)]"></div>

                    {/* Admin Profile */}
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <h2 className="text-sm font-semibold theme-heading">Admin</h2>
                            <p className="text-[10px] theme-muted font-medium uppercase tracking-wider">Super Administrator</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/10 border border-indigo-400/20">
                            <FiUser className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Navbar;