import { FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "../hooks/useTheme";

function ThemeToggle({ compact = false }) {
    const { theme, toggleTheme, isDark } = useTheme();

    return (
        <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Present Mode (Dark)"}
            aria-label={isDark ? "Switch to light mode" : "Switch to present mode"}
            className={`flex items-center gap-2 rounded-xl border transition-all ${
                compact
                    ? "w-10 h-10 justify-center theme-toggle-btn"
                    : "px-3 py-2 theme-toggle-btn text-xs font-semibold"
            }`}
        >
            {isDark ? (
                <>
                    <FiSun className="w-4 h-4 text-amber-400" />
                    {!compact && <span>Light Mode</span>}
                </>
            ) : (
                <>
                    <FiMoon className="w-4 h-4 text-indigo-500" />
                    {!compact && <span>Present Mode</span>}
                </>
            )}
            {!compact && (
                <span className="theme-toggle-pill ml-1 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider">
                    {theme === "dark" ? "Dark" : "Light"}
                </span>
            )}
        </button>
    );
}

export default ThemeToggle;
