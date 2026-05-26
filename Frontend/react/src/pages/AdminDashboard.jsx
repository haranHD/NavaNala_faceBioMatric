import { useEffect, useState, useCallback } from "react";
import AdminLayout from "../layouts/AdminLayout";
import { apiService } from "../services/api";
import { useToast } from "../hooks/useToast";
import { FiFilter, FiDownload } from "react-icons/fi";

function statusBadgeClass(status) {
    const s = (status || "").toLowerCase();
    if (s.includes("late") || s.includes("exceeded") || s.includes("early") || s === "absent") {
        return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
    }
    if (s.includes("permission")) return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
}

function violationRow(r) {
    return r.late_status || r.lunch_exceeded_status || r.early_checkout_status;
}

function AdminDashboard() {
    const { showToast } = useToast();
    const [employees, setEmployees] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [summary, setSummary] = useState({
        total_employees: 0,
        present_today: 0,
        absent_today: 0,
        late_entry: 0,
        lunch_exceeded: 0,
        early_checkout: 0,
        on_permission: 0,
        avg_working_hours: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({
        date: new Date().toISOString().split("T")[0],
        employee_id: "",
        department: "All",
        gender: "All",
        status: "All",
    });

    const loadDashboardData = useCallback(async () => {
        setIsLoading(true);
        try {
            const filterPayload = {
                date: filters.date,
                department: filters.department,
                gender: filters.gender,
                status: filters.status,
                employee_id: filters.employee_id ? Number(filters.employee_id) : undefined,
            };
            const [emps, atts, sum] = await Promise.all([
                apiService.getEmployees(),
                apiService.getAttendance(filterPayload),
                apiService.getAttendanceSummary(filterPayload),
            ]);
            setEmployees(emps);
            setAttendance(atts);
            setSummary(sum);
        } catch {
            showToast("Failed to load dashboard", "error");
        } finally {
            setIsLoading(false);
        }
    }, [filters, showToast]);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    const exportCsv = () => {
        window.open(apiService.exportAttendanceCsvUrl({
            date: filters.date,
            department: filters.department,
            gender: filters.gender,
            status: filters.status,
            employee_id: filters.employee_id ? Number(filters.employee_id) : undefined,
        }), "_blank");
    };

    const closeDay = async () => {
        try {
            const res = await apiService.closeAttendanceDay(filters.date);
            showToast(`Marked ${res.marked_absent} absent for ${res.date}`, "success");
            loadDashboardData();
        } catch {
            showToast("Close day failed", "error");
        }
    };

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex h-[60vh] items-center justify-center">
                    <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="glass-panel p-4 rounded-2xl mb-6 flex flex-wrap gap-3 items-end">
                <div className="flex items-center gap-2 theme-muted text-xs font-semibold uppercase">
                    <FiFilter /> Filters
                </div>
                <input type="date" className="glass-input px-3 py-2 rounded-xl text-sm" value={filters.date}
                    onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
                <select className="glass-input px-3 py-2 rounded-xl text-sm" value={filters.employee_id}
                    onChange={(e) => setFilters({ ...filters, employee_id: e.target.value })}>
                    <option value="">All Employees</option>
                    {employees.map((e) => (
                        <option key={e.employee_id} value={e.employee_id}>
                            {e.employee_code} — {e.name}
                        </option>
                    ))}
                </select>
                <select className="glass-input px-3 py-2 rounded-xl text-sm" value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}>
                    <option value="All">All Departments</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Operations">Operations</option>
                </select>
                <select className="glass-input px-3 py-2 rounded-xl text-sm" value={filters.gender}
                    onChange={(e) => setFilters({ ...filters, gender: e.target.value })}>
                    <option value="All">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                </select>
                <select className="glass-input px-3 py-2 rounded-xl text-sm" value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                    <option value="All">All Statuses</option>
                    <option value="Present">Present</option>
                    <option value="Late Entry">Late Entry</option>
                    <option value="Early Checkout">Early Checkout</option>
                    <option value="Permission Approved">Permission Approved</option>
                    <option value="Absent">Absent</option>
                </select>
                <button onClick={exportCsv} className="theme-toggle-btn flex items-center gap-2 px-3 py-2 rounded-xl text-xs border">
                    <FiDownload /> CSV
                </button>
                <button onClick={closeDay} className="glass-btn px-3 py-2 rounded-xl text-xs text-white font-semibold">
                    Close Day (Absent)
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-8">
                {[
                    ["Present", summary.present_today, "text-emerald-400", false],
                    ["Absent", summary.absent_today, "text-rose-400", true],
                    ["Late Entry", summary.late_entry, "text-rose-400", true],
                    ["Lunch Exceeded", summary.lunch_exceeded, "text-rose-400", true],
                    ["Early Checkout", summary.early_checkout, "text-rose-400", true],
                    ["On Permission", summary.on_permission, "text-amber-400", false],
                    ["Avg Hours", `${summary.avg_working_hours}h`, "text-indigo-400", false],
                ].map(([label, val, color, viol]) => (
                    <div key={label} className={`glass-card p-4 rounded-2xl ${viol ? "border border-rose-500/20" : ""}`}>
                        <span className="theme-muted text-[10px] font-semibold uppercase block">{label}</span>
                        <span className={`text-2xl font-bold block mt-1 ${color}`}>{val}</span>
                    </div>
                ))}
            </div>

            <div className="glass-panel rounded-2xl p-6 overflow-hidden">
                <h2 className="text-base font-bold theme-heading mb-4">Today&apos;s Attendance</h2>
                <div className="overflow-x-auto">
                    <table className="glass-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Check-In</th>
                                <th>Lunch Out</th>
                                <th>Lunch In</th>
                                <th>Check-Out</th>
                                <th>Hours</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendance.map((row) => (
                                <tr key={row.attendance_id} className={violationRow(row) ? "bg-rose-500/5" : ""}>
                                    <td className="font-semibold theme-heading text-sm">
                                        {row.employee_code} — {row.employee_name}
                                    </td>
                                    <td className="text-xs">{row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString() : "—"}</td>
                                    <td className="text-xs">{row.lunch_out_time ? new Date(row.lunch_out_time).toLocaleTimeString() : "—"}</td>
                                    <td className="text-xs">{row.lunch_in_time ? new Date(row.lunch_in_time).toLocaleTimeString() : "—"}</td>
                                    <td className="text-xs">{row.check_out_time ? new Date(row.check_out_time).toLocaleTimeString() : "—"}</td>
                                    <td className="text-xs font-mono text-indigo-400">
                                        {row.working_hours ? `${row.working_hours}h` : "—"}
                                    </td>
                                    <td>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadgeClass(row.status)}`}>
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl mt-6 text-xs theme-muted">
                <p className="font-semibold theme-heading text-sm mb-2">Scan order (IST)</p>
                <p>1. Check-In → 2. Lunch Check-Out (1:00–1:30 PM) → 3. Lunch Check-In (within 45 min) → 4. EOD Check-Out (Men 6:45 PM / Women 6:00 PM)</p>
            </div>
        </AdminLayout>
    );
}

export default AdminDashboard;
