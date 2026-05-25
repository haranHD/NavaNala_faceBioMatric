import React, { createContext, useContext, useState, useCallback } from 'react';
import { FiX, FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
                {toasts.map((toast) => {
                    let bg = 'bg-slate-900/90 border-slate-700/50';
                    let icon = <FiInfo className="text-indigo-400 w-5 h-5 flex-shrink-0" />;
                    if (toast.type === 'success') {
                        bg = 'bg-emerald-950/90 border-emerald-500/30';
                        icon = <FiCheckCircle className="text-emerald-400 w-5 h-5 flex-shrink-0" />;
                    } else if (toast.type === 'error') {
                        bg = 'bg-rose-950/90 border-rose-500/30';
                        icon = <FiAlertCircle className="text-rose-400 w-5 h-5 flex-shrink-0" />;
                    }

                    return (
                        <div
                            key={toast.id}
                            className={`flex items-start justify-between p-4 rounded-xl border backdrop-blur-md shadow-2xl animate-fade-in ${bg} transition-all duration-300`}
                        >
                            <div className="flex items-center gap-3">
                                {icon}
                                <span className="text-sm font-medium text-slate-200">{toast.message}</span>
                            </div>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="text-slate-400 hover:text-slate-200 transition-colors ml-4 mt-0.5"
                            >
                                <FiX className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
