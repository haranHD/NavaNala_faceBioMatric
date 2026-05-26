import { useEffect, useState, useCallback } from "react";
import AdminLayout from "../layouts/AdminLayout";
import { apiService } from "../services/api";
import { useToast } from "../hooks/useToast";
import {
    FiSearch,
    FiDownload,
    FiChevronLeft,
    FiChevronRight,
    FiFilter,
} from "react-icons/fi";

function formatTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US");
}

function statusClass(status) {
    const s = (status || "").toLowerCase();
    if (s.includes("late") || s.includes("exceeded") || s.includes("early") || s === "absent") {
        return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
    }
    if (s.includes("permission")) {
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    }
    if (s === "present" || s === "in progress") {
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    }
    return "bg-slate-500/10 text-slate-400 border border-slate-500/20";
}

function rowViolation(log) {
    return log.late_status || log.lunch_exceeded_status || log.early_checkout_status;
}

function AttendanceHistory() {
    const { showToast } = useToast();
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [deptFilter, setDeptFilter] = useState("All");
    const [dateFilter, setDateFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [genderFilter, setGenderFilter] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const loadHistoryData = useCallback(async () => {
        setIsLoading(true);
        try {
            const filters = {
                department: deptFilter,
                gender: genderFilter,
                status: statusFilter,
            };
            if (dateFilter) filters.date = dateFilter;
            const atts = await apiService.getAttendance(filters);
            setLogs(atts);
        } catch {
            showToast("Failed to load attendance logs", "error");
        } finally {
            setIsLoading(false);
        }
    }, [dateFilter, deptFilter, genderFilter, statusFilter, showToast]);

    useEffect(() => {
        loadHistoryData();
    }, [loadHistoryData]);

    const filteredLogs = logs.filter((log) => {
        const q = searchQuery.toLowerCase();
        return (
            (log.employee_name || "").toLowerCase().includes(q) ||
            String(log.employee_id).includes(q) ||
            (log.employee_code || "").toLowerCase().includes(q)
        );
    });

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, deptFilter, dateFilter, statusFilter, genderFilter]);

    const exportToCSV = () => {
        window.open(
            apiService.exportAttendanceCsvUrl({
                date: dateFilter || undefined,
                department: deptFilter,
                gender: genderFilter,
                status: statusFilter,
            }),
            "_blank"
        );
    };

    return (
        <AdminLayout>
            <div className="glass-panel p-6 rounded-2xl mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <h2 className="text-base font-bold theme-heading flex items-center gap-2">
                        <FiFilter className="text-indigo-400" />
                        Log Filters
                    </h2>
                    <button
                        onClick={exportToCSV}
                        className="glass-btn flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white"
                    >
                        <FiDownload /> Export CSV
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="relative lg:col-span-2">
                        <FiSearch className="absolute left-3 top-2.5 w-4 h-4 theme-muted" />
                        <input
                            type="text"
                            placeholder="Search name or ID..."
                            className="w-full glass-input pl-10 py-2 text-xs rounded-xl"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <input
                        type="date"
                        className="glass-input px-3 py-2 text-xs rounded-xl"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    />
                    <select
                        className="glass-input px-3 py-2 text-xs rounded-xl"
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                    >
                        <option value="All">All Departments</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Product">Product</option>
                        <option value="Operations">Operations</option>
                        <option value="Executive">Executive</option>
                    </select>
                    <select
                        className="glass-input px-3 py-2 text-xs rounded-xl"
                        value={genderFilter}
                        onChange={(e) => setGenderFilter(e.target.value)}
                    >
                        <option value="All">All Genders</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                    <select
                        className="glass-input px-3 py-2 text-xs rounded-xl lg:col-span-2"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Present">Present</option>
                        <option value="Late Entry">Late Entry</option>
                        <option value="Lunch Break Exceeded">Lunch Break Exceeded</option>
                        <option value="Early Checkout">Early Checkout</option>
                        <option value="Permission Approved">Permission Approved</option>
                        <option value="Absent">Absent</option>
                        <option value="In Progress">In Progress</option>
                    </select>
                </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden mb-6">
                <div className="overflow-x-auto">
                    <table className="glass-table">
                        <thead>
                            <tr>
                                <th>Employee ID</th>
                                <th>Employee Name</th>
                                <th>Department</th>
                                <th>Date</th>
                                <th>Check-In</th>
                                <th>Lunch Out</th>
                                <th>Lunch In</th>
                                <th>Check-Out</th>
                                <th>Hours</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="10" className="text-center py-10">
                                        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : (
                                paginatedLogs.map((log) => (
                                    <tr
                                        key={log.attendance_id}
                                        className={rowViolation(log) ? "bg-rose-500/5" : ""}
                                    >
                                        <td className="font-mono text-xs text-indigo-400">
                                            {log.employee_code || log.employee_id}
                                        </td>
                                        <td className="font-semibold theme-heading">
                                            {log.employee_name}
                                        </td>
                                        <td>{log.department || "—"}</td>
                                        <td className="text-xs">
                                            {formatDate(log.attendance_date || log.check_in)}
                                        </td>
                                        <td className="text-xs">{formatTime(log.check_in_time)}</td>
                                        <td className="text-xs">{formatTime(log.lunch_out_time)}</td>
                                        <td className="text-xs">{formatTime(log.lunch_in_time)}</td>
                                        <td className="text-xs">{formatTime(log.check_out_time)}</td>
                                        <td className="font-mono text-xs text-indigo-400">
                                            {log.working_hours ? `${log.working_hours}h` : "—"}
                                            {log.overtime_hours > 0 && (
                                                <span className="block text-amber-400 text-[10px]">
                                                    OT {log.overtime_hours}h
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusClass(log.status)}`}
                                            >
                                                {log.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                            {!isLoading && paginatedLogs.length === 0 && (
                                <tr>
                                    <td colSpan="10" className="text-center theme-muted py-10">
                                        No records for selected filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center px-2">
                    <span className="text-xs theme-muted">
                        Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg theme-toggle-btn border disabled:opacity-30"
                        >
                            <FiChevronLeft />
                        </button>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg theme-toggle-btn border disabled:opacity-30"
                        >
                            <FiChevronRight />
                        </button>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

export default AttendanceHistory;
