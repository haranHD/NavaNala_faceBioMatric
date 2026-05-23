import AdminLayout from "../layouts/AdminLayout";

function AttendancePage() {
    const data = [
        { name: "Hari", id: "EMP001", date: "2026-05-22", status: "Present" },
        { name: "John", id: "EMP002", date: "2026-05-22", status: "Absent" },
    ];

    return (
        <AdminLayout>
            <h1 className="text-3xl font-bold mb-6">Attendance</h1>

            <table className="w-full bg-white rounded-lg shadow">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="p-3">Name</th>
                        <th className="p-3">ID</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Status</th>
                    </tr>
                </thead>

                <tbody>
                    {data.map((e, i) => (
                        <tr key={i} className="border-t">
                            <td className="p-3">{e.name}</td>
                            <td className="p-3">{e.id}</td>
                            <td className="p-3">{e.date}</td>
                            <td className="p-3">{e.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </AdminLayout>
    );
}

export default AttendancePage;