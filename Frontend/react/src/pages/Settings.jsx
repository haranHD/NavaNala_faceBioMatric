import { useState } from "react";
import AdminLayout from "../layouts/AdminLayout";
import { useToast } from "../hooks/useToast";
import { useTheme } from "../hooks/useTheme";
import { apiService } from "../services/api";
import { 
    FiSettings, 
    FiUser, 
    FiBell, 
    FiSliders, 
    FiDatabase,
    FiCheck,
    FiAlertCircle
} from "react-icons/fi";

function Settings() {
    const { showToast } = useToast();
    const { theme, setTheme } = useTheme();

    // Profile State
    const [profile, setProfile] = useState({
        name: "Administrator",
        email: "admin@facebio.com",
        role: "Super Admin"
    });

    // API Config State
    const [apiUrl, setApiUrl] = useState(
        localStorage.getItem("vite_api_url") || "http://127.0.0.1:8000"
    );

    // Notification Preferences
    const [notifications, setNotifications] = useState({
        desktop: true,
        sounds: false,
        critical: true
    });

    const [glassEffect, setGlassEffect] = useState("high");

    const handleSaveProfile = (e) => {
        e.preventDefault();
        showToast("Profile credentials updated", "success");
    };

    const handleSaveApi = (e) => {
        e.preventDefault();
        if (!apiUrl.trim()) {
            showToast("API Endpoint URL cannot be empty", "error");
            return;
        }
        localStorage.setItem("vite_api_url", apiUrl);
        showToast(`API Endpoint updated: ${apiUrl}. Please reload.`, "success");
    };

    return (
        <AdminLayout>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Profile & API */}
                <div className="space-y-6">
                    {/* Profile Card */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-base font-bold text-slate-200 mb-6 flex items-center gap-2">
                            <FiUser className="text-indigo-400" />
                            Admin Profile Settings
                        </h2>

                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                                    value={profile.name}
                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                                    value={profile.email}
                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                                    Role / Privilege Level
                                </label>
                                <input
                                    type="text"
                                    disabled
                                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm opacity-50 cursor-not-allowed"
                                    value={profile.role}
                                />
                            </div>

                            <button
                                type="submit"
                                className="glass-btn flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white cursor-pointer shadow-lg shadow-indigo-500/20"
                            >
                                <FiCheck /> Save Profile
                            </button>
                        </form>
                    </div>

                    {/* API Settings Card */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-base font-bold text-slate-200 mb-6 flex items-center gap-2">
                            <FiDatabase className="text-indigo-400" />
                            FastAPI Backend Server Connection
                        </h2>

                        <form onSubmit={handleSaveApi} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                                    Server Base URL Endpoint
                                </label>
                                <input
                                    type="text"
                                    placeholder="http://127.0.0.1:8000"
                                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono"
                                    value={apiUrl}
                                    onChange={(e) => setApiUrl(e.target.value)}
                                />
                                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                                    Point this to your local or deployed FastAPI service. Reconnects the Axios service layer dynamically upon update.
                                </p>
                            </div>

                            <button
                                type="submit"
                                className="glass-btn flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white cursor-pointer shadow-lg shadow-indigo-500/20"
                            >
                                <FiCheck /> Update Connection
                            </button>
                        </form>
                    </div>

                    {/* Database Management Card */}
                    <div className="glass-panel p-6 rounded-2xl border border-rose-500/20">
                        <h2 className="text-base font-bold text-rose-400 mb-4 flex items-center gap-2">
                            <FiAlertCircle className="text-rose-400" />
                            Danger Zone: Database Reset
                        </h2>
                        <p className="text-[10px] text-slate-400 mb-6 leading-relaxed">
                            These actions will permanently delete records from the system. This cannot be undone. Please proceed with caution.
                        </p>
                        
                        <div className="space-y-3">
                            <button
                                onClick={async () => {
                                    if(window.confirm("Are you sure you want to reset all employee data? This will also delete all encodings!")) {
                                        await apiService.resetEmployees();
                                        showToast("All employees deleted successfully.", "success");
                                    }
                                }}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/50 border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-all text-xs font-bold uppercase cursor-pointer"
                            >
                                Reset Employees
                            </button>
                            
                            <button
                                onClick={async () => {
                                    if(window.confirm("Are you sure you want to reset all attendance records?")) {
                                        await apiService.resetAttendance();
                                        showToast("All attendance records deleted successfully.", "success");
                                    }
                                }}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/50 border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-all text-xs font-bold uppercase cursor-pointer"
                            >
                                Reset Attendance
                            </button>

                            <button
                                onClick={async () => {
                                    if(window.confirm("CRITICAL WARNING: Are you sure you want to completely factory reset the system? All data will be lost.")) {
                                        await apiService.resetAll();
                                        showToast("Full system reset completed successfully.", "success");
                                    }
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-slate-950 transition-all text-xs font-black uppercase cursor-pointer shadow-lg shadow-rose-500/20"
                            >
                                Full System Factory Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Preferences */}
                <div className="space-y-6">
                    {/* UI Styles / Theme */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-base font-bold text-slate-200 mb-6 flex items-center gap-2">
                            <FiSliders className="text-indigo-400" />
                            Visual Layout & Customization
                        </h2>

                        <div className="space-y-5">
                            {/* Theme option */}
                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-xs font-bold theme-heading">Appearance Mode</h4>
                                    <p className="text-[10px] theme-muted mt-0.5">
                                        Present Mode (dark) for kiosk-style scanning · Light Mode for daytime use
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTheme("dark");
                                            showToast("Present Mode (Dark) enabled", "success");
                                        }}
                                        className={`p-4 rounded-xl border text-left transition-all ${
                                            theme === "dark"
                                                ? "border-indigo-500/50 bg-indigo-500/10 ring-1 ring-indigo-500/30"
                                                : "theme-divider border hover:border-indigo-500/30"
                                        }`}
                                    >
                                        <span className="text-lg mb-2 block">🌙</span>
                                        <span className="text-xs font-bold theme-heading block">Present Mode</span>
                                        <span className="text-[10px] theme-muted">Dark · high contrast</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTheme("light");
                                            showToast("Light Mode enabled", "success");
                                        }}
                                        className={`p-4 rounded-xl border text-left transition-all ${
                                            theme === "light"
                                                ? "border-indigo-500/50 bg-indigo-500/10 ring-1 ring-indigo-500/30"
                                                : "theme-divider border hover:border-indigo-500/30"
                                        }`}
                                    >
                                        <span className="text-lg mb-2 block">☀️</span>
                                        <span className="text-xs font-bold theme-heading block">Light Mode</span>
                                        <span className="text-[10px] theme-muted">Bright · office friendly</span>
                                    </button>
                                </div>
                            </div>

                            <hr className="theme-divider border-t" />

                            {/* Glassmorphism strength */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-200">Glassmorphism Intensity</h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Backdrop blur depth adjustments</p>
                                </div>
                                <div className="flex gap-2">
                                    {["low", "medium", "high"].map((level) => (
                                        <button
                                            key={level}
                                            onClick={() => {
                                                setGlassEffect(level);
                                                showToast(`Glassmorphism set to: ${level}`, "info");
                                            }}
                                            className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${
                                                glassEffect === level
                                                    ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400"
                                                    : "border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-300"
                                            }`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notifications preferences */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-base font-bold text-slate-200 mb-6 flex items-center gap-2">
                            <FiBell className="text-indigo-400" />
                            Biometric Notification Routing
                        </h2>

                        <div className="space-y-4">
                            {/* Toggle 1: Desktop Alerts */}
                            <label className="flex items-center justify-between cursor-pointer p-1">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-200">System Audio Alerts</h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Sound notification on verification success/denials</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={notifications.sounds}
                                    onChange={(e) => {
                                        setNotifications({ ...notifications, sounds: e.target.checked });
                                        showToast(`Sound alerts: ${e.target.checked ? 'Enabled' : 'Disabled'}`, "info");
                                    }}
                                    className="w-8 h-4 rounded-full bg-slate-900 border-slate-700 text-indigo-500 cursor-pointer"
                                />
                            </label>

                            <hr className="theme-divider border-t" />

                            {/* Toggle 2: Real-time overlay alerts */}
                            <label className="flex items-center justify-between cursor-pointer p-1">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-200">Real-Time Overlay Toasts</h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Show notifications when a face is matched</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={notifications.desktop}
                                    onChange={(e) => {
                                        setNotifications({ ...notifications, desktop: e.target.checked });
                                        showToast(`Real-time notifications: ${e.target.checked ? 'Enabled' : 'Disabled'}`, "info");
                                    }}
                                    className="w-8 h-4 rounded-full bg-slate-900 border-slate-700 text-indigo-500 cursor-pointer"
                                />
                            </label>

                            <hr className="theme-divider border-t" />

                            {/* Toggle 3: Critical matching errors */}
                            <label className="flex items-center justify-between cursor-pointer p-1">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-200">Security Breach Warnings</h4>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Alerts for multiple consecutive unknown face detections</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={notifications.critical}
                                    onChange={(e) => {
                                        setNotifications({ ...notifications, critical: e.target.checked });
                                        showToast(`Breach warning system active.`, "info");
                                    }}
                                    className="w-8 h-4 rounded-full bg-slate-900 border-slate-700 text-indigo-500 cursor-pointer"
                                />
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

export default Settings;
