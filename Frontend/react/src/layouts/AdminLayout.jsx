import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function AdminLayout({ children }) {
    return (
        <div className="flex min-h-screen theme-page-bg transition-colors duration-300">
            {/* Sidebar (fixed w-64) */}
            <Sidebar />

            {/* Content Area */}
            <div className="flex-grow pl-64 min-h-screen flex flex-col">
                <div className="p-6 md:p-8 flex-grow flex flex-col">
                    <Navbar />
                    <div className="flex-grow">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminLayout;