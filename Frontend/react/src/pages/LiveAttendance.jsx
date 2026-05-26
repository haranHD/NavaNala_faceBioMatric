import { useEffect, useState, useRef } from "react";
import AdminLayout from "../layouts/AdminLayout";
import Webcam from "react-webcam";
import { apiService } from "../services/api";
import { useToast } from "../hooks/useToast";
import { 
    FiCamera, 
    FiAlertTriangle, 
    FiCheckCircle, 
    FiClock,
    FiUser
} from "react-icons/fi";

function LiveAttendance() {
    const { showToast } = useToast();
    const webcamRef = useRef(null);
    const employeesRef = useRef([]);
    const pauseUntilRef = useRef(0);
    const lastUnknownToastRef = useRef(0);
    const [employees, setEmployees] = useState([]);
    const [isScanning, setIsScanning] = useState(true);
    const [scanStatus, setScanStatus] = useState("Ready"); // Ready, Scanning, Verifying, Success, Unknown
    const [verifyHint, setVerifyHint] = useState("");
    const [lastMatch, setLastMatch] = useState(null);
    const [recentLogs, setRecentLogs] = useState([]);

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            const data = await apiService.getEmployees();
            setEmployees(data);
            employeesRef.current = data;
        } catch (error) {
            console.error("Failed to load employees for lookup", error);
        }
    };

    // Automated recognition loop
    useEffect(() => {
        let intervalId;

        if (isScanning) {
            intervalId = setInterval(async () => {
                if (!webcamRef.current) return;
                if (Date.now() < pauseUntilRef.current) return;

                setScanStatus("Scanning");
                setVerifyHint("");
                const imageSrc = webcamRef.current.getScreenshot();

                if (!imageSrc) return;

                try {
                    const result = await apiService.recognizeFace(imageSrc);
                    const roster = employeesRef.current;
                    const findEmployee = (id) =>
                        roster.find((e) => String(e.employee_id) === String(id));

                    if (result.matched && result.employee_id) {
                        const matchedEmp = findEmployee(result.employee_id);

                        if (matchedEmp) {
                            const att = await apiService.markAttendance({
                                employee_id: matchedEmp.employee_id,
                                confidence: result.confidence,
                            });

                            const logEntry = {
                                id: Date.now(),
                                name: matchedEmp.name,
                                department: matchedEmp.department,
                                confidence: result.confidence,
                                event: att.event_type,
                                status: att.status,
                                warnings: att.warnings || [],
                                working_hours: att.working_hours,
                                time: new Date().toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                }),
                            };

                            setLastMatch(logEntry);
                            setRecentLogs((prev) => [logEntry, ...prev.slice(0, 4)]);
                            setScanStatus("Success");
                            setVerifyHint("");
                            const warn = att.warnings?.length ? ` — ${att.warnings[0]}` : "";
                            const step = att.event_type ? ` [${att.event_type.replace("_", " ")}]` : "";
                            showToast(`${att.message}${step}: ${matchedEmp.name}${warn}`, att.warnings?.length ? "error" : "success");
                            setVerifyHint(att.next_expected_event ? `Next: ${att.next_expected_event}` : "");
                            pauseUntilRef.current = Date.now() + 5000;
                        }
                    } else if (result.waiting && result.employee_id) {
                        const pending = findEmployee(result.employee_id);
                        setScanStatus("Verifying");
                        setVerifyHint(
                            pending
                                ? `Verifying ${pending.name}… (${Math.round((result.confidence || 0) * 100)}%)`
                                : "Verifying identity…"
                        );
                    } else if (result.reason === "no_face") {
                        setScanStatus("Scanning");
                        setVerifyHint("Move closer — face not detected");
                    } else {
                        setScanStatus("Unknown");
                        setLastMatch(null);
                        setVerifyHint("");
                        const now = Date.now();
                        if (now - lastUnknownToastRef.current > 4000) {
                            lastUnknownToastRef.current = now;
                            showToast("Face not recognized. Re-register if needed.", "error");
                        }
                    }
                } catch (error) {
                    const detail = error.response?.data?.detail;
                    if (detail) {
                        showToast(typeof detail === "string" ? detail : "Attendance error", "error");
                    }
                    console.error("Recognition error", error);
                }
            }, 600);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isScanning, showToast]);

    const toggleScanning = () => {
        setIsScanning(!isScanning);
        setScanStatus(!isScanning ? "Ready" : "Paused");
    };

    return (
        <AdminLayout>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left Side: Camera Panel (occupies 3 columns) */}
                <div className="glass-panel p-6 rounded-2xl lg:col-span-3 flex flex-col items-center justify-center relative min-h-[480px]">
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isScanning ? 'bg-indigo-500 animate-pulse' : 'bg-slate-600'}`}></span>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            {isScanning ? "Scanning Live Feed" : "Camera Stream Paused"}
                        </span>
                    </div>

                    {/* Camera View */}
                    <div className="relative w-full max-w-lg aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800/80 mt-6 shadow-2xl">
                        {isScanning ? (
                            <>
                                <Webcam
                                    ref={webcamRef}
                                    audio={false}
                                    screenshotFormat="image/jpeg"
                                    screenshotQuality={0.92}
                                    videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
                                    className="w-full h-full object-cover"
                                />

                                {/* Sci-Fi Biometric Scanning Laser Overlay */}
                                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_10px_#6366f1] animate-scan pointer-events-none"></div>

                                {/* Circular Scanner Frame */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className={`w-56 h-56 rounded-full border-2 border-dashed transition-all duration-300 ${
                                        scanStatus === "Success"
                                            ? "border-emerald-500"
                                            : scanStatus === "Unknown"
                                                ? "border-rose-500"
                                                : scanStatus === "Verifying"
                                                    ? "border-amber-400"
                                                    : "border-indigo-500/50"
                                    }`}></div>
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-3">
                                <FiCamera className="w-12 h-12 stroke-[1.5]" />
                                <p className="text-sm font-medium">Scanner is currently offline</p>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <button
                        onClick={toggleScanning}
                        className={`mt-6 px-6 py-2.5 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer ${
                            isScanning 
                                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50' 
                                : 'bg-indigo-500 text-slate-950 hover:bg-indigo-400 font-bold'
                        }`}
                    >
                        {isScanning ? "Pause Scanner" : "Activate Scanner"}
                    </button>
                </div>

                {/* Right Side: Log & Recognition Panel (occupies 2 columns) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    
                    {/* Active Match Card */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-base font-bold text-slate-200 mb-4">Biometric Verification</h2>
                        
                        {scanStatus === "Success" && lastMatch ? (
                            <div className="text-center animate-fade-in py-3">
                                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-4">
                                    <FiCheckCircle className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-100">{lastMatch.name}</h3>
                                <p className="text-xs text-indigo-400 font-semibold uppercase mt-0.5">{lastMatch.department}</p>
                                
                                <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-800">
                                    <div className="text-left bg-slate-900/30 p-3 rounded-xl border border-slate-850">
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Match Rate</span>
                                        <span className="text-sm font-bold text-slate-200 mt-1 block">{(lastMatch.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="text-left bg-slate-900/30 p-3 rounded-xl border border-slate-850">
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Timestamp</span>
                                        <span className="text-sm font-bold text-slate-200 mt-1 block">{lastMatch.time}</span>
                                    </div>
                                </div>
                                <span className="mt-6 inline-flex text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">
                                    Attendance Logged
                                </span>
                            </div>
                        ) : scanStatus === "Unknown" ? (
                            <div className="text-center py-6 animate-fade-in">
                                <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-4">
                                    <FiAlertTriangle className="w-8 h-8 animate-bounce" />
                                </div>
                                <h3 className="text-lg font-bold text-rose-400">Access Denied</h3>
                                <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">
                                    Unknown profile detected. Ensure you are looking directly at the scanner or contact administration.
                                </p>
                            </div>
                        ) : (
                            <div className="text-center py-10 text-slate-500 flex flex-col items-center justify-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-center">
                                    <FiUser className="w-6 h-6 text-slate-600" />
                                </div>
                                <p className="text-xs max-w-xs leading-relaxed">
                                    {verifyHint ||
                                        (isScanning
                                            ? "Align your face in the camera scanner. Detections will register automatically."
                                            : "Scanner is paused. Enable scanner to begin verification.")}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Scan Feed Logs */}
                    <div className="glass-panel p-6 rounded-2xl flex-grow">
                        <h2 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
                            <FiClock className="text-indigo-400" />
                            Live Verification Logs
                        </h2>

                        <div className="space-y-3">
                            {recentLogs.map((log) => (
                                <div 
                                    key={log.id} 
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 animate-fade-in"
                                >
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-200">{log.name}</h4>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{log.department} • Match: {(log.confidence * 100).toFixed(0)}%</p>
                                    </div>
                                    <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-2.5 py-1 rounded-lg">
                                        {log.time}
                                    </span>
                                </div>
                            ))}
                            {recentLogs.length === 0 && (
                                <p className="text-center text-xs text-slate-500 py-6">
                                    No verifications recorded this session.
                                </p>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </AdminLayout>
    );
}

export default LiveAttendance;
