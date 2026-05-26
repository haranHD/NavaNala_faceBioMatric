import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import ThemeToggle from "../components/ThemeToggle";

function Login() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    
    const [email, setEmail] = useState("admin@facebio.com");
    const [password, setPassword] = useState("admin123");
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        
        // Simple client-side validation
        if (!email.trim() || !password.trim()) {
            showToast("Please fill in all fields", "error");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast("Please enter a valid email address", "error");
            return;
        }

        if (password.length < 6) {
            showToast("Password must be at least 6 characters", "error");
            return;
        }

        setIsLoading(true);

        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            if (email === "admin@facebio.com" && password === "admin123") {
                // Mock JWT Token handling
                const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockTokenPayload";
                localStorage.setItem("auth_token", mockToken);
                if (rememberMe) {
                    localStorage.setItem("saved_email", email);
                } else {
                    localStorage.removeItem("saved_email");
                }
                showToast("Login successful! Welcome back.", "success");
                navigate("/admin");
            } else {
                showToast("Invalid credentials. Try admin@facebio.com / admin123", "error");
            }
        }, 1200);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden theme-page-bg-alt px-4">
            <div className="absolute top-6 right-6 z-20">
                <ThemeToggle />
            </div>
            {/* Animated glowing background blobs */}
            <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl pulse-ring"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl pulse-ring" style={{ animationDelay: '1.5s' }}></div>

            <div className="glass-panel w-full max-w-md p-8 md:p-10 rounded-3xl shadow-2xl relative z-10 border border-white/10">
                {/* Logo and Header */}
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-500/30 mx-auto mb-4">
                        F
                    </div>
                    <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                        Welcome Back
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">
                        Sign in to the Admin Dashboard
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} className="space-y-6">
                    {/* Email Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                            Email Address
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                                <FiMail className="w-5 h-5" />
                            </span>
                            <input
                                type="email"
                                className="w-full glass-input pl-11 pr-4 py-3 rounded-xl text-sm"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                            Password
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                                <FiLock className="w-5 h-5" />
                            </span>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="w-full glass-input pl-11 pr-11 py-3 rounded-xl text-sm"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Remember me & Forgot Password */}
                    <div className="flex items-center justify-between text-xs">
                        <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-700 bg-slate-900/50 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                            />
                            <span>Remember me</span>
                        </label>
                        <a href="#" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                            Forgot Password?
                        </a>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full glass-btn py-3 rounded-xl text-sm font-semibold text-white cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>

                {/* Helper credentials hint */}
                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                    <p className="text-[11px] text-slate-500">
                        Demo Account: <span className="text-slate-400">admin@facebio.com</span> / <span className="text-slate-400">admin123</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;