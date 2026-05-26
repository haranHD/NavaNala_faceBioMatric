import { useEffect, useState } from "react";
import AdminLayout from "../layouts/AdminLayout";
import { apiService } from "../services/api";
import { useToast } from "../hooks/useToast";
import { FiClock, FiCheck, FiX } from "react-icons/fi";

function Permissions() {
    const { showToast } = useToast();
    const [employees, setEmployees] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [form, setForm] = useState({
        employee_id: "",
        permission_date: new Date().toISOString().split("T")[0],
        from_time: "09:00",
        to_time: "10:00",
        reason: "",
    });

    const load = async () => {
        const [emps, perms] = await Promise.all([
            apiService.getEmployees(),
            apiService.getPermissions(),
        ]);
        setEmployees(emps);
        setPermissions(perms);
    };

    useEffect(() => {
        load().catch(() => showToast("Failed to load permissions", "error"));
    }, []);

    const submitRequest = async (e) => {
        e.preventDefault();
        try {
            await apiService.createPermission({
                employee_id: Number(form.employee_id),
                permission_date: form.permission_date,
                from_time: form.from_time,
                to_time: form.to_time,
                reason: form.reason,
            });
            showToast("Permission request submitted", "success");
            load();
        } catch (err) {
            showToast(err.response?.data?.detail || "Request failed", "error");
        }
    };

    const review = async (id, approve) => {
        try {
            await apiService.reviewPermission(id, approve);
            showToast(approve ? "Approved" : "Rejected", "success");
            load();
        } catch (err) {
            showToast(err.response?.data?.detail || "Review failed", "error");
        }
    };

    return (
        <AdminLayout>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-2xl lg:col-span-1">
                    <h2 className="text-base font-bold theme-heading mb-4 flex items-center gap-2">
                        <FiClock className="text-indigo-400" /> Request Permission
                    </h2>
                    <p className="text-xs theme-muted mb-4">
                        Monthly limit per employee: <strong>2h 30m</strong>
                    </p>
                    <form onSubmit={submitRequest} className="space-y-3">
                        <select
                            required
                            className="w-full glass-input px-3 py-2 rounded-xl text-sm"
                            value={form.employee_id}
                            onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                        >
                            <option value="">Select Employee</option>
                            {employees.map((e) => (
                                <option key={e.employee_id} value={e.employee_id}>
                                    {e.employee_code} — {e.name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="date"
                            required
                            className="w-full glass-input px-3 py-2 rounded-xl text-sm"
                            value={form.permission_date}
                            onChange={(e) => setForm({ ...form, permission_date: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="time"
                                required
                                className="glass-input px-3 py-2 rounded-xl text-sm"
                                value={form.from_time}
                                onChange={(e) => setForm({ ...form, from_time: e.target.value })}
                            />
                            <input
                                type="time"
                                required
                                className="glass-input px-3 py-2 rounded-xl text-sm"
                                value={form.to_time}
                                onChange={(e) => setForm({ ...form, to_time: e.target.value })}
                            />
                        </div>
                        <textarea
                            required
                            className="w-full glass-input px-3 py-2 rounded-xl text-sm min-h-[80px]"
                            placeholder="Reason..."
                            value={form.reason}
                            onChange={(e) => setForm({ ...form, reason: e.target.value })}
                        />
                        <button type="submit" className="w-full glass-btn py-2.5 rounded-xl text-sm font-semibold text-white">
                            Submit Request
                        </button>
                    </form>
                </div>

                <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
                    <h2 className="text-base font-bold theme-heading mb-4">Permission Requests</h2>
                    <div className="space-y-3 max-h-[520px] overflow-y-auto">
                        {permissions.map((p) => {
                            const emp = employees.find((e) => e.employee_id === p.employee_id);
                            return (
                                <div
                                    key={p.permission_id}
                                    className="p-4 rounded-xl border theme-divider flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                >
                                    <div>
                                        <p className="font-semibold theme-heading text-sm">
                                            {emp?.name || `Employee #${p.employee_id}`}
                                        </p>
                                        <p className="text-xs theme-muted">
                                            {p.permission_date} · {p.from_time}–{p.to_time} · {p.duration_minutes} min
                                        </p>
                                        <p className="text-xs theme-muted mt-1">{p.reason}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                                                p.status === "approved"
                                                    ? "text-emerald-400 bg-emerald-500/10"
                                                    : p.status === "rejected"
                                                    ? "text-rose-400 bg-rose-500/10"
                                                    : "text-amber-400 bg-amber-500/10"
                                            }`}
                                        >
                                            {p.status}
                                        </span>
                                        {p.status === "pending" && (
                                            <>
                                                <button
                                                    onClick={() => review(p.permission_id, true)}
                                                    className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"
                                                >
                                                    <FiCheck />
                                                </button>
                                                <button
                                                    onClick={() => review(p.permission_id, false)}
                                                    className="p-2 rounded-lg bg-rose-500/10 text-rose-400"
                                                >
                                                    <FiX />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {permissions.length === 0 && (
                            <p className="text-center theme-muted text-sm py-8">No permission requests yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

export default Permissions;
