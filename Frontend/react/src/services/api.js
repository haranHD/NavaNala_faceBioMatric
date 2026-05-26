import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

function attendanceParams(filters = {}) {
    const params = {};
    if (filters.date) params.date = filters.date;
    if (filters.employee_id) params.employee_id = filters.employee_id;
    if (filters.department && filters.department !== 'All') params.department = filters.department;
    if (filters.gender && filters.gender !== 'All') params.gender = filters.gender;
    return params;
}

export const apiService = {
    async getEmployees() {
        const response = await apiClient.get('/employees');
        return response.data;
    },

    async getNextEmployeeCode() {
        const response = await apiClient.get('/employees/next-code');
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

    async getAttendance(filters = {}) {
        const response = await apiClient.get('/attendance', { params: attendanceParams(filters) });
        return response.data;
    },

    async getAttendanceSummary(filters = {}) {
        const response = await apiClient.get('/attendance/summary', { params: attendanceParams(filters) });
        return response.data;
    },

    async closeAttendanceDay(date) {
        const response = await apiClient.post('/attendance/close-day', null, {
            params: date ? { date } : {},
        });
        return response.data;
    },

    async getPermissions(employeeId, status) {
        const params = {};
        if (employeeId) params.employee_id = employeeId;
        if (status) params.status = status;
        const response = await apiClient.get('/permissions', { params });
        return response.data;
    },

    async getPermissionBalance(employeeId) {
        const response = await apiClient.get(`/permissions/balance/${employeeId}`);
        return response.data;
    },

    async createPermission(data) {
        const response = await apiClient.post('/permissions', data);
        return response.data;
    },

    async reviewPermission(permissionId, approve) {
        const response = await apiClient.patch(`/permissions/${permissionId}/review`, { approve });
        return response.data;
    },

    async markAttendance(attendanceData) {
        const response = await apiClient.post('/attendance', attendanceData);
        return response.data;
    },

    exportAttendanceCsvUrl(filters = {}) {
        const params = new URLSearchParams(attendanceParams(filters));
        return `${API_BASE_URL}/attendance/export/csv?${params.toString()}`;
    },

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
