import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const apiService = {
    // 👤 EMPLOYEES
    async getEmployees() {
        const response = await apiClient.get('/employees');
        return response.data;
    },

    async createEmployee(employeeData) {
        const response = await apiClient.post('/employees', employeeData);
        return response.data;
    },

    async updateEmployee(employeeId, employeeData) {
        const response = await apiClient.put(`/employees/${employeeId}`, employeeData);
        return response.data;
    },

    async deleteEmployee(employeeId) {
        const response = await apiClient.delete(`/employees/${employeeId}`);
        return response.data;
    },

    async deleteEmployeeFaceData(employeeId) {
        const response = await apiClient.delete(`/employees/${employeeId}/face-data`);
        return response.data;
    },

    // 🗓️ ATTENDANCE
    async getAttendance() {
        const response = await apiClient.get('/attendance');
        return response.data;
    },

    async markAttendance(attendanceData) {
        const response = await apiClient.post('/attendance', attendanceData);
        return response.data;
    },

    // 📸 FACE RECOGNITION
    async registerFace(employeeId, imagesBase64Array) {
        const response = await apiClient.post('/register-face', {
            employee_id: employeeId.toString(),
            images: imagesBase64Array
        });
        return response.data;
    },

    async recognizeFace(imageBase64) {
        const response = await apiClient.post('/recognize-face', {
            image: imageBase64
        });
        return response.data;
    },
    
    // ⚙️ ADMIN DB RESET
    async resetEmployees() {
        const response = await apiClient.delete('/admin/reset-employees');
        return response.data;
    },

    async resetAttendance() {
        const response = await apiClient.delete('/admin/reset-attendance');
        return response.data;
    },

    async resetAll() {
        const response = await apiClient.delete('/admin/reset-all');
        return response.data;
    }
};

