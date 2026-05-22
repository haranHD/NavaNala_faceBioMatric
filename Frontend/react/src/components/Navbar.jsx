function Navbar() {
    return (
        <div className="bg-white shadow-md rounded-xl px-6 py-4 flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">
                    Face Biometric Attendance System
                </h1>
                <p className="text-sm text-gray-500">
                    Smart Employee Attendance Tracking
                </p>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right">
                    <h2 className="font-semibold">Admin</h2>
                    <p className="text-sm text-gray-500">System Administrator</p>
                </div>

                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    A
                </div>
            </div>
        </div>
    );
}

export default Navbar;