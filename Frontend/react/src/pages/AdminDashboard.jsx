import AdminLayout from "../layouts/AdminLayout";

function AdminDashboard() {
    return (
        <AdminLayout>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-500 mt-2">
                Attendance analytics will appear here
            </p>
        </AdminLayout>
    );
}

export default AdminDashboard;