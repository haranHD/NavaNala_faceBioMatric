function Login() {
    return (
        <div className="h-screen flex items-center justify-center">
            <div className="bg-white p-10 rounded-2xl shadow-lg w-96">
                <h1 className="text-3xl font-bold text-center mb-6">
                    Face Biometric App
                </h1>

                <input className="w-full border p-3 mb-4 rounded" placeholder="Employee ID" />
                <input className="w-full border p-3 mb-4 rounded" placeholder="Password" />

                <select className="w-full border p-3 mb-6 rounded">
                    <option>User</option>
                    <option>Admin</option>
                </select>

                <button className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700">
                    Login
                </button>
            </div>
        </div>
    );
}

export default Login;