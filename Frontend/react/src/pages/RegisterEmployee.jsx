import { useState } from "react";
import AdminLayout from "../layouts/AdminLayout";

function RegisterEmployee() {
    const [name, setName] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [role, setRole] = useState("User");

    return (
        <AdminLayout>
            <h1 className="text-3xl font-bold mb-6">Register Employee</h1>

            <div className="bg-white p-6 rounded-xl shadow max-w-xl">
                <input
                    className="w-full border p-3 mb-4 rounded"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                <input
                    className="w-full border p-3 mb-4 rounded"
                    placeholder="Employee ID"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                />

                <select
                    className="w-full border p-3 mb-4 rounded"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                >
                    <option>User</option>
                    <option>Admin</option>
                </select>

                <button className="w-full bg-green-600 text-white py-3 rounded">
                    Register (Backend later)
                </button>
            </div>
        </AdminLayout>
    );
}

export default RegisterEmployee;