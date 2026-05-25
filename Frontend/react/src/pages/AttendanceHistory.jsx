import { useEffect, useState } from "react";
import AdminLayout from "../layouts/AdminLayout";
import { apiService } from "../services/api";
import { useToast } from "../hooks/useToast";
import { 
    FiSearch, 
    FiDownload, 
    FiChevronLeft, 
    FiChevronRight,
    FiCalendar,
    FiFilter
} from "react-icons/fi";

function AttendanceHistory() {
    const { showToast } = useToast();
    const [logs, setLogs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [deptFilter, setDeptFilter] = useState("All");
    const [dateFilter, setDateFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    useEffect(() => {
        loadHistoryData();
    }, []);

    const loadHistoryData = async () => {
        setIsLoading(true);
        try {
            const emps = await apiService.getEmployees();
            const atts = await apiService.getAttendance();
            
            setEmployees(emps);
            
            // Map attendance with employee information
            const mappedLogs = atts.map((att) => {
                const emp = emps.find(e => e.employee_id === att.employee_id);
                return {
                    id: att.attendance_id,
                    employee_id: att.employee_id,
                    name: emp ? emp.name : `Employee #${att.employee_id}`,
                    department: emp ? emp.department : "N/A",
                    check_in: att.check_in,
                    status: att.status
                };
            }).sort((a, b) => new Date(b.check_in) - new Date(a.check_in)); // Sort newest first

            setLogs(mappedLogs);
        } catch (error) {
            showToast("Failed to load attendance logs", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Filter Logic
    const filteredLogs = logs.filter((log) => {
        const matchesSearch = 
            log.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.employee_id.toString().includes(searchQuery);

        const matchesDept = deptFilter === "All" || log.department === deptFilter;
        
        const matchesStatus = statusFilter === "All" || log.status === statusFilter;

        let matchesDate = true;
        if (dateFilter) {
            const filterDateStr = new Date(dateFilter).toDateString();
            const logDateStr = new Date(log.check_in).toDateString();
            matchesDate = filterDateStr === logDateStr;
        }

        return matchesSearch && matchesDept && matchesStatus && matchesDate;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, deptFilter, dateFilter, statusFilter]);

    // CSV Exporter
    const exportToCSV = () => {
        if (filteredLogs.length === 0) {
            showToast("No data available to export", "error");
            return;
        }

        const headers = ["Log ID", "Employee ID", "Employee Name", "Department", "Date", "Time", "Status"];
        const rows = filteredLogs.map((log) => {
            const dateObj = new Date(log.check_in);
            const dateStr = dateObj.toLocaleDateString("en-US");
            const timeStr = dateObj.toLocaleTimeString("en-US", { hour12: false });
            return [
                log.id,
                log.employee_id,
                `"${log.name}"`,
                `"${log.department}"`,
                dateStr,
                timeStr,
                log.status
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Attendance_Export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast("CSV Export downloaded successfully!", "success");
    };

    return (
        <AdminLayout>
            {/* Filter Dashboard Header */}
            <div className="glass-panel p-6 rounded-2xl mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                        <FiFilter className="text-indigo-400" />
                        Log Filters
                    </h2>
                    <button
                        onClick={exportToCSV}
                        className="glass-btn flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
                    >
                        <FiDownload /> Export CSV
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search query */}
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                            <FiSearch className="w-4 h-4" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search Name or ID..."
                            className="w-full glass-input pl-10 pr-4 py-2 text-xs rounded-xl"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Department */}
                    <select
                        className="glass-input px-4 py-2 text-xs rounded-xl"
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                    >
                        <option value="All">All Departments</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Product">Product</option>
                        <option value="Operations">Operations</option>
                        <option value="Executive">Executive</option>
                        <option value="Editorial">Editorial</option>
                    </select>

                    {/* Date picker */}
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                            <FiCalendar className="w-4 h-4" />
                        </span>
                        <input
                            type="date"
                            className="w-full glass-input pl-10 pr-4 py-2 text-xs rounded-xl"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        />
                    </div>

                    {/* Status */}
                    <select
                        className="glass-input px-4 py-2 text-xs rounded-xl"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                    </select>
                </div>
            </div>

            {/* Attendance Logs Table */}
            <div className="glass-panel rounded-2xl overflow-hidden mb-6">
                <div className="overflow-x-auto">
                    <table className="glass-table">
                        <thead>
                            <tr>
                                <th>Log ID</th>
                                <th>Emp ID</th>
                                <th>Employee Name</th>
                                <th>Department</th>
                                <th>Check-in Date & Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-10">
                                        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                                    </td>
                                </tr>
                            ) : paginatedLogs.map((log) => {
                                const dateObj = new Date(log.check_in);
                                return (
                                    <tr key={log.id}>
                                        <td className="font-mono text-xs text-slate-500">
                                            #{log.id}
                                        </td>
                                        <td className="font-mono text-xs text-indigo-400">
                                            #{String(log.employee_id).padStart(4, '0')}
                                        </td>
                                        <td className="font-semibold text-slate-200">
                                            {log.name}
                                        </td>
                                        <td>{log.department}</td>
                                        <td className="text-xs">
                                            {dateObj.toLocaleDateString("en-US")} {dateObj.toLocaleTimeString("en-US", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                second: "2-digit"
                                            })}
                                        </td>
                                        <td>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                log.status === 'Present' 
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                            }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {!isLoading && paginatedLogs.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center text-slate-500 py-10">
                                        No log records found matching the filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center px-2">
                    <span className="text-xs text-slate-400">
                        Showing page <span className="font-semibold text-slate-200">{currentPage}</span> of <span className="font-semibold text-slate-200">{totalPages}</span>
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-850 bg-slate-900/40 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <FiChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-slate-850 bg-slate-900/40 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <FiChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

export default AttendanceHistory;
