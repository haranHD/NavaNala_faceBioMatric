import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import { apiService } from "../services/api";
import { useToast } from "../hooks/useToast";
import { 
    FiPlus, 
    FiSearch, 
    FiEdit2, 
    FiTrash2, 
    FiCamera, 
    FiChevronLeft, 
    FiChevronRight,
    FiX,
    FiCameraOff
} from "react-icons/fi";

function EmployeeManagement() {
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        department: "Engineering",
        role: "Developer",
        gender: "",
        employee_code: "",
        idMode: "auto",
    });
    const [nextAutoCode, setNextAutoCode] = useState("");

    // Search, filter & paginate states
    const [searchQuery, setSearchQuery] = useState("");
    const [deptFilter, setDeptFilter] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.getEmployees();
            setEmployees(data);
        } catch (error) {
            showToast("Failed to fetch employees", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchNextCode = async () => {
        try {
            const data = await apiService.getNextEmployeeCode();
            setNextAutoCode(data.employee_code);
            return data.employee_code;
        } catch {
            const year = new Date().getFullYear();
            setNextAutoCode(`0001-${year}`);
            return `0001-${year}`;
        }
    };

    const handleOpenAddModal = async () => {
        setEditingEmployee(null);
        const code = await fetchNextCode();
        setFormData({
            name: "",
            department: "Engineering",
            role: "Developer",
            gender: "",
            employee_code: code,
            idMode: "auto",
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (emp) => {
        setEditingEmployee(emp);
        setFormData({
            name: emp.name,
            department: emp.department || "Engineering",
            role: emp.role || "Developer",
            gender: emp.gender || "",
            employee_code: emp.employee_code || "",
            idMode: "manual",
        });
        setIsModalOpen(true);
    };

    const handleDeleteEmployee = async (id) => {
        if (!confirm("Are you sure you want to completely delete this employee? This will also delete their encodings and attendance history.")) return;
        try {
            await apiService.deleteEmployee(id);
            showToast("Employee deleted successfully", "success");
            loadEmployees();
        } catch (error) {
            showToast("Failed to delete employee", "error");
        }
    };

    const handleResetFaceData = async (id) => {
        if (!confirm("Are you sure you want to delete this employee's face data? They will need to be re-registered.")) return;
        try {
            await apiService.deleteEmployeeFaceData(id);
            showToast("Face data reset successfully", "success");
            loadEmployees();
        } catch (error) {
            showToast("Failed to reset face data", "error");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            showToast("Name is required", "error");
            return;
        }
        if (!formData.gender) {
            showToast("Gender is required", "error");
            return;
        }

        try {
            const payload = {
                name: formData.name,
                department: formData.department,
                role: formData.role,
                gender: formData.gender,
                employee_code: formData.idMode === "manual" ? formData.employee_code : null,
                auto_generate_code: formData.idMode === "auto",
            };

            if (editingEmployee) {
                await apiService.updateEmployee(editingEmployee.employee_id, {
                    ...payload,
                    employee_code: formData.employee_code,
                    auto_generate_code: false,
                });
                showToast("Employee updated successfully", "success");
            } else {
                const created = await apiService.createEmployee(payload);
                showToast(
                    `Employee registered — ID: ${created.employee_code || created.employee_id}`,
                    "success"
                );
            }
            setIsModalOpen(false);
            loadEmployees();
        } catch (error) {
            const detail = error.response?.data?.detail;
            showToast(typeof detail === "string" ? detail : "Operation failed", "error");
        }
    };

    // Filter and Search Logic
    const filteredEmployees = employees.filter((emp) => {
        const code = (emp.employee_code || "").toLowerCase();
        const matchesSearch =
            emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.employee_id.toString().includes(searchQuery) ||
            code.includes(searchQuery.toLowerCase());
        
        const matchesDept = deptFilter === "All" || emp.department === deptFilter;

        return matchesSearch && matchesDept;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
    const paginatedEmployees = filteredEmployees.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    // Reset pagination when search/filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, deptFilter]);

    return (
        <AdminLayout>
            {/* Top action bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center mb-6">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3 flex-grow max-w-xl">
                    <div className="relative flex-grow">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                            <FiSearch className="w-5 h-5" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            className="w-full glass-input pl-10 pr-4 py-2 text-sm rounded-xl"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <select
                        className="glass-input px-4 py-2 text-sm rounded-xl"
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
                </div>

                {/* Add Employee Button */}
                <button
                    onClick={handleOpenAddModal}
                    className="glass-btn flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer"
                >
                    <FiPlus /> Add Employee
                </button>
            </div>

            {/* Employee Table */}
            <div className="glass-panel rounded-2xl overflow-hidden mb-6">
                <div className="overflow-x-auto">
                    <table className="glass-table">
                        <thead>
                            <tr>
                                <th>Employee ID</th>
                                <th>Name</th>
                                <th>Department</th>
                                <th>Role</th>
                                <th>Gender</th>
                                <th>Face Status</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-10">
                                        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
                                    </td>
                                </tr>
                            ) : paginatedEmployees.map((emp) => (
                                <tr key={emp.employee_id}>
                                    <td className="font-mono text-xs text-indigo-400">
                                        {emp.employee_code || `#${String(emp.employee_id).padStart(4, "0")}`}
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/50 flex items-center justify-center font-bold text-slate-300 text-sm">
                                                {emp.name.charAt(0)}
                                            </div>
                                            <span className="font-semibold text-slate-200">{emp.name}</span>
                                        </div>
                                    </td>
                                    <td>{emp.department || "N/A"}</td>
                                    <td>{emp.role || "User"}</td>
                                    <td>{emp.gender || "—"}</td>
                                    <td>
                                        <div className="flex flex-col gap-1 items-start">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                                emp.is_registered 
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${emp.is_registered ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                                                {emp.is_registered ? "Registered" : "Not Registered"}
                                            </span>
                                            {emp.is_registered && (
                                                <span className="text-[10px] text-slate-500 px-1">
                                                    {emp.encoding_count} encoding{emp.encoding_count !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center justify-center gap-3">
                                            {/* Register Face shortcut */}
                                            <button
                                                onClick={() => navigate(`/admin/register-face?id=${emp.employee_id}`)}
                                                title="Capture/Enroll Face"
                                                className={`p-1.5 rounded-lg border transition-colors ${
                                                    emp.is_registered
                                                        ? "text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700"
                                                        : "text-indigo-400 border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/30"
                                                }`}
                                            >
                                                <FiCamera className="w-4 h-4" />
                                            </button>
                                            
                                            {/* Edit */}
                                            <button
                                                onClick={() => handleOpenEditModal(emp)}
                                                title="Edit Employee details"
                                                className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
                                            >
                                                <FiEdit2 className="w-4 h-4" />
                                            </button>

                                            {/* Reset Face Data */}
                                            {emp.is_registered && (
                                                <button
                                                    onClick={() => handleResetFaceData(emp.employee_id)}
                                                    title="Reset Face Data"
                                                    className="p-1.5 rounded-lg border border-slate-800 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/20 transition-colors"
                                                >
                                                    <FiCameraOff className="w-4 h-4" />
                                                </button>
                                            )}
                                            
                                            {/* Delete */}
                                            <button
                                                onClick={() => handleDeleteEmployee(emp.employee_id)}
                                                title="Delete Employee"
                                                className="p-1.5 rounded-lg border border-slate-800 text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 transition-colors"
                                            >
                                                <FiTrash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!isLoading && paginatedEmployees.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="text-center text-slate-500 py-10">
                                        No employees found matching the filters.
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

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-md p-6 rounded-2xl shadow-2xl border border-white/10 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-100">
                                {editingEmployee ? "Edit Employee" : "Add New Employee"}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Employee ID */}
                            <div>
                                <label className="text-xs font-semibold theme-muted uppercase tracking-wider block mb-2">
                                    Employee ID
                                </label>
                                {!editingEmployee && (
                                    <div className="flex gap-2 mb-3">
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const code = await fetchNextCode();
                                                setFormData((f) => ({
                                                    ...f,
                                                    idMode: "auto",
                                                    employee_code: code,
                                                }));
                                            }}
                                            className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                                                formData.idMode === "auto"
                                                    ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-400"
                                                    : "theme-divider border theme-muted"
                                            }`}
                                        >
                                            Auto-generate
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setFormData((f) => ({ ...f, idMode: "manual" }))
                                            }
                                            className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                                                formData.idMode === "manual"
                                                    ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-400"
                                                    : "theme-divider border theme-muted"
                                            }`}
                                        >
                                            Enter manually
                                        </button>
                                    </div>
                                )}
                                {formData.idMode === "auto" && !editingEmployee ? (
                                    <div className="glass-input px-4 py-2.5 rounded-xl text-sm font-mono text-indigo-400 flex justify-between items-center">
                                        <span>{formData.employee_code || nextAutoCode}</span>
                                        <span className="text-[10px] theme-muted uppercase">Next in sequence</span>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-mono"
                                        placeholder="e.g. 0001-2026"
                                        value={formData.employee_code}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                employee_code: e.target.value,
                                            })
                                        }
                                    />
                                )}
                                <p className="text-[10px] theme-muted mt-1.5">
                                    Format: 4-digit sequence + year (example: 0001-{new Date().getFullYear()})
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-semibold theme-muted uppercase tracking-wider block mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                                    placeholder="Enter employee's name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                                    Department
                                </label>
                                <select
                                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                >
                                    <option value="Engineering">Engineering</option>
                                    <option value="Product">Product</option>
                                    <option value="Operations">Operations</option>
                                    <option value="Executive">Executive</option>
                                    <option value="Editorial">Editorial</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                                    Role / Title
                                </label>
                                <input
                                    type="text"
                                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                                    placeholder="e.g. Developer, HR Associate"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold theme-muted uppercase tracking-wider block mb-1.5">
                                    Gender
                                </label>
                                <select
                                    name="gender"
                                    required
                                    className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full glass-btn mt-6 py-3 rounded-xl text-sm font-semibold text-white flex justify-center items-center cursor-pointer shadow-lg shadow-indigo-500/20"
                            >
                                {editingEmployee ? "Update Employee" : "Create Employee"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

export default EmployeeManagement;
