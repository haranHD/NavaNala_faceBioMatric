import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import Webcam from "react-webcam";
import { apiService } from "../services/api";
import { useToast } from "../hooks/useToast";
import { 
    FiCamera, 
    FiAlertCircle, 
    FiUserCheck, 
    FiRotateCcw,
    FiCheck
} from "react-icons/fi";

const CAPTURE_STEPS = [
    { step: 1, label: "Look straight into the camera", angle: "Front View" },
    { step: 2, label: "Turn your head slightly to the left", angle: "Left Profile" },
    { step: 3, label: "Turn your head slightly to the right", angle: "Right Profile" },
    { step: 4, label: "Tilt your head slightly up", angle: "Slightly Up" },
    { step: 5, label: "Tilt your head slightly down", angle: "Slightly Down" },
];

function FaceRegistration() {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const webcamRef = useRef(null);

    const [employees, setEmployees] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [capturedImages, setCapturedImages] = useState([]);
    const [currentStepIdx, setCurrentStepIdx] = useState(0);
    const [isRegistering, setIsRegistering] = useState(false);

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            const data = await apiService.getEmployees();
            setEmployees(data);
            
            // Check for search param pre-selection
            const queryId = searchParams.get("id");
            if (queryId) {
                setSelectedId(queryId);
            } else if (data.length > 0) {
                // Find first unregistered
                const unregistered = data.find(e => !e.is_registered);
                setSelectedId(unregistered ? unregistered.employee_id.toString() : data[0].employee_id.toString());
            }
        } catch (error) {
            showToast("Failed to fetch employees", "error");
        }
    };

    const captureFrame = () => {
        if (!webcamRef.current) return;
        const screenshot = webcamRef.current.getScreenshot();
        
        if (screenshot) {
            const newCaptures = [...capturedImages, screenshot];
            setCapturedImages(newCaptures);
            showToast(`Captured ${CAPTURE_STEPS[currentStepIdx].angle}!`, "success");
            
            if (currentStepIdx < CAPTURE_STEPS.length - 1) {
                setCurrentStepIdx(currentStepIdx + 1);
            }
        } else {
            showToast("Camera frame capture failed", "error");
        }
    };

    const resetCaptures = () => {
        setCapturedImages([]);
        setCurrentStepIdx(0);
    };

    const handleRegister = async () => {
        if (!selectedId) {
            showToast("Please select an employee first", "error");
            return;
        }

        if (capturedImages.length < CAPTURE_STEPS.length) {
            showToast("Please capture all 3 required angles", "error");
            return;
        }

        setIsRegistering(true);
        try {
            // Register captured face images in the backend as an array
            await apiService.registerFace(selectedId, capturedImages);
            
            showToast("Face biometric registered successfully with 5 angles!", "success");
            navigate("/admin/employees");
        } catch (error) {
            showToast("Failed to enroll face", "error");
        } finally {
            setIsRegistering(false);
        }
    };

    const currentEmployee = employees.find(e => e.employee_id.toString() === selectedId);

    return (
        <AdminLayout>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Setup Panel */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between h-fit">
                    <div>
                        <h2 className="text-base font-bold text-slate-200 mb-4">Enrollment Configuration</h2>
                        
                        {/* Employee Select */}
                        <div className="space-y-2 mb-6">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                                Target Employee
                            </label>
                            <select
                                className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                                value={selectedId}
                                onChange={(e) => {
                                    setSelectedId(e.target.value);
                                    resetCaptures();
                                }}
                            >
                                <option value="">Select Employee...</option>
                                {employees.map((emp) => (
                                    <option key={emp.employee_id} value={emp.employee_id}>
                                        {emp.name} ({emp.is_registered ? "Registered" : "Pending"})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {currentEmployee && (
                            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 mb-6 text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Department:</span>
                                    <span className="font-semibold text-slate-200">{currentEmployee.department}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Role:</span>
                                    <span className="font-semibold text-slate-200">{currentEmployee.role}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Status:</span>
                                    <span className={`font-semibold ${currentEmployee.is_registered ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {currentEmployee.is_registered ? 'Registered (Overwrites)' : 'Not Enrolled'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Capture Step Tracker */}
                        <div className="space-y-4">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                                Capture Checklist
                            </label>
                            {CAPTURE_STEPS.map((step, idx) => {
                                const isDone = capturedImages.length > idx;
                                const isCurrent = currentStepIdx === idx && capturedImages.length < CAPTURE_STEPS.length;
                                return (
                                    <div 
                                        key={step.step}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                            isDone 
                                                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                                                : isCurrent
                                                    ? 'bg-indigo-500/5 border-indigo-500/30 text-indigo-300 shadow-md shadow-indigo-500/5'
                                                    : 'bg-slate-900/20 border-slate-800/50 text-slate-500'
                                        }`}
                                    >
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                            isDone 
                                                ? 'bg-emerald-500 text-slate-950' 
                                                : isCurrent 
                                                    ? 'bg-indigo-500 text-white' 
                                                    : 'bg-slate-800 text-slate-600'
                                        }`}>
                                            {isDone ? <FiCheck className="w-3.5 h-3.5" /> : step.step}
                                        </div>
                                        <div className="text-xs">
                                            <p className="font-bold">{step.angle}</p>
                                            <p className="opacity-80">{step.label}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-8 space-y-3">
                        <button
                            onClick={handleRegister}
                            disabled={capturedImages.length < CAPTURE_STEPS.length || isRegistering}
                            className="w-full glass-btn py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {isRegistering ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <FiUserCheck className="w-5 h-5" /> Enroll Face Biometrics
                                </>
                            )}
                        </button>
                        
                        {capturedImages.length > 0 && (
                            <button
                                onClick={resetCaptures}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-slate-200 text-xs font-semibold hover:bg-slate-800/40 transition-all"
                            >
                                <FiRotateCcw className="w-3.5 h-3.5" /> Reset Captures
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Side: Camera Feed Panel */}
                <div className="glass-panel p-6 rounded-2xl lg:col-span-2 flex flex-col items-center justify-center relative min-h-[450px]">
                    {capturedImages.length < CAPTURE_STEPS.length ? (
                        <>
                            {/* Webcam View */}
                            <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
                                <Webcam
                                    ref={webcamRef}
                                    audio={false}
                                    screenshotFormat="image/jpeg"
                                    className="w-full h-full object-cover"
                                />
                                
                                {/* Target Circle Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-60 h-60 rounded-full border-2 border-dashed border-indigo-400/60 pulse-ring"></div>
                                </div>

                                {/* Current Step Helper Overlay */}
                                <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 border border-slate-800 backdrop-blur-md px-4 py-2.5 rounded-xl text-center">
                                    <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest">
                                        Step {CAPTURE_STEPS[currentStepIdx].step}: {CAPTURE_STEPS[currentStepIdx].angle}
                                    </p>
                                    <p className="text-xs text-slate-200 mt-0.5">
                                        {CAPTURE_STEPS[currentStepIdx].label}
                                    </p>
                                </div>
                            </div>

                            {/* Trigger capture */}
                            <button
                                onClick={captureFrame}
                                className="mt-6 flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-bold transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95 cursor-pointer"
                            >
                                <FiCamera className="w-5 h-5 text-slate-950" /> Take Snapshot
                            </button>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-4 animate-bounce">
                                <FiCheck className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-200">Snapshots Complete</h3>
                            <p className="text-sm text-slate-400 mt-2 max-w-sm">
                                All 5 required face angles captured successfully. Click "Enroll Face Biometrics" to finalize registration.
                            </p>

                            {/* Capture previews */}
                            <div className="flex gap-4 justify-center mt-6">
                                {capturedImages.map((img, idx) => (
                                    <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-800 shadow-lg">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <span className="absolute bottom-1 left-1 bg-slate-950/80 text-[8px] text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase">
                                            {CAPTURE_STEPS[idx].day || CAPTURE_STEPS[idx].angle.split(" ")[0]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

export default FaceRegistration;
