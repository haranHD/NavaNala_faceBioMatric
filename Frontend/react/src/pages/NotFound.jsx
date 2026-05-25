import { useNavigate } from "react-router-dom";
import { FiHome, FiAlertOctagon } from "react-icons/fi";

function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#070b13] px-4">
            {/* Background blur decorative circles */}
            <div className="absolute top-1/3 left-1/3 w-72 h-72 rounded-full bg-rose-600/10 blur-3xl pulse-ring"></div>
            <div className="absolute bottom-1/3 right-1/3 w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl pulse-ring" style={{ animationDelay: '2s' }}></div>

            <div className="glass-panel w-full max-w-md p-8 md:p-10 rounded-3xl shadow-2xl relative z-10 text-center border border-white/5 animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-6">
                    <FiAlertOctagon className="w-8 h-8" />
                </div>
                
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                    Page Not Found
                </h1>
                
                <p className="text-sm text-slate-400 mt-3 max-w-xs mx-auto leading-relaxed">
                    The URL path you are trying to access does not exist or may have been relocated.
                </p>

                <button
                    onClick={() => navigate("/admin")}
                    className="glass-btn mt-8 py-3 px-6 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                >
                    <FiHome className="w-4 h-4" /> Go to Dashboard
                </button>
            </div>
        </div>
    );
}

export default NotFound;
