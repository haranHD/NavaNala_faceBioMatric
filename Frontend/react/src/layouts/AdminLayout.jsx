import Sidebar from "../components/Sidebar";

function AdminLayout({ children }) {
    return (
        <div className="flex min-h-screen">
            <Sidebar />

            <div className="flex-1 ml-64 p-6">
                {children}
            </div>
        </div>
    );
}

export default AdminLayout;