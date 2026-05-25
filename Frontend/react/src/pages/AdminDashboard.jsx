import { useEffect, useState } from "react";
import AdminLayout from "../layouts/AdminLayout";
import { apiService } from "../services/api";
import { useToast } from "../hooks/useToast";
import { 
    FiUsers, 
    FiCheckCircle, 
    FiAlertCircle, 
    FiTrendingUp,
    FiArrowRight,
    FiActivity
} from "react-icons/fi";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend
} from "recharts";

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981'];

function AdminDashboard() {
    const { showToast } = useToast();
    const [employees, setEmployees] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [stats, setStats] = useState({
        totalEmployees: 0,
        presentToday: 0,
        absentToday: 0,
        percentage: 0
    });

    const [chartData, setChartData] = useState([]);
    const [deptChartData, setDeptChartData] = useState([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setIsLoading(true);
        try {
            const emps = await apiService.getEmployees();
            const atts = await apiService.getAttendance();

            setEmployees(emps);
            setAttendance(atts);
            calculateStats(emps, atts);
            prepareChartData(atts, emps);
        } catch (error) {
            showToast("Failed to load dashboard data", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const calculateStats = (emps, atts) => {
        const total = emps.length;
        
        // Filter attendance for 'today' (simulated to 2026-05-23 based on current date)
        const todayStr = new Date().toISOString().split('T')[0];
        const todayAtts = atts.filter(a => a.check_in && a.check_in.startsWith(todayStr));
        
        const present = todayAtts.filter(a => a.status === 'Present').length;
        const absent = total - present;
        const pct = total > 0 ? Math.round((present / total) * 100) : 0;

        setStats({
            totalEmployees: total,
            presentToday: present,
            absentToday: absent >= 0 ? absent : 0,
            percentage: pct
        });
    };

    const prepareChartData = (atts, emps) => {
        // 1. Weekly Trends (Last 5 days)
        const weeklyRaw = [
            { day: 'Mon', Present: 3, Absent: 2 },
            { day: 'Tue', Present: 4, Absent: 1 },
            { day: 'Wed', Present: 3, Absent: 2 },
            { day: 'Thu', Present: 4, Absent: 1 },
            { day: 'Fri', Present: 3, Absent: 2 },
        ];
        setChartData(weeklyRaw);

        // 2. Department Breakdown
        const deptCounts = {};
        emps.forEach(emp => {
            const dept = emp.department || 'Other';
            deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        });
        
        const deptData = Object.keys(deptCounts).map(dept => ({
            name: dept,
            value: deptCounts[dept]
        }));
        setDeptChartData(deptData);
    };

    // Simulated Real-Time Updates
    useEffect(() => {
        const interval = setInterval(() => {
            if (employees.length === 0) return;

            // Pick a random unregistered employee to check in
            const unregistered = employees.filter(e => {
                // Find if employee already checked in today
                const todayStr = new Date().toISOString().split('T')[0];
                const checkedIn = attendance.some(a => a.employee_id === e.employee_id && a.check_in && a.check_in.startsWith(todayStr));
                return !checkedIn;
            });

            if (unregistered.length > 0) {
                const target = unregistered[Math.floor(Math.random() * unregistered.length)];
                const newRecord = {
                    id: attendance.length + 1,
                    employee_id: target.employee_id,
                    status: 'Present',
                    check_in: new Date().toISOString()
                };

                const updatedAtt = [newRecord, ...attendance];
                setAttendance(updatedAtt);
                calculateStats(employees, updatedAtt);
                showToast(`Real-time update: ${target.name} checked in!`, "success");
            }
        }, 12000); // Trigger check-in simulation every 12s

        return () => clearInterval(interval);
    }, [employees, attendance]);

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex h-[60vh] items-center justify-center">
                    <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
            </AdminLayout>
        );
    }

    // Get table records with resolved names
    const getRecentCheckins = () => {
        return attendance.slice(0, 5).map(att => {
            const emp = employees.find(e => e.employee_id === att.employee_id);
            return {
                id: att.attendance_id,
                name: emp ? emp.name : `Employee #${att.employee_id}`,
                department: emp ? emp.department : 'N/A',
                status: att.status,
                time: att.check_in ? new Date(att.check_in).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'N/A'
            };
        });
    };

    return (
        <AdminLayout>
            {/* Stats Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Employees */}
                <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
                    <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Total Employees</span>
                        <span className="text-3xl font-extrabold text-white mt-1 block">{stats.totalEmployees}</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <FiUsers className="w-6 h-6" />
                    </div>
                </div>

                {/* Present Today */}
                <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
                    <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Present Today</span>
                        <span className="text-3xl font-extrabold text-emerald-400 mt-1 block">{stats.presentToday}</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <FiCheckCircle className="w-6 h-6" />
                    </div>
                </div>

                {/* Absent Today */}
                <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
                    <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Absent Today</span>
                        <span className="text-3xl font-extrabold text-rose-400 mt-1 block">{stats.absentToday}</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                        <FiAlertCircle className="w-6 h-6" />
                    </div>
                </div>

                {/* Attendance Rate */}
                <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
                    <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">Attendance Rate</span>
                        <span className="text-3xl font-extrabold text-amber-400 mt-1 block">{stats.percentage}%</span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <FiTrendingUp className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Line Chart */}
                <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                            <FiActivity className="text-indigo-400" />
                            Weekly Attendance Trends
                        </h2>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                                <YAxis stroke="#64748b" fontSize={11} />
                                <Tooltip 
                                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                    labelStyle={{ color: '#94a3b8' }}
                                />
                                <Area type="monotone" dataKey="Present" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorPresent)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                    <h2 className="text-base font-bold text-slate-200 mb-4">Department Share</h2>
                    <div className="h-48 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={deptChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {deptChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Pie Legend */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-3">
                        {deptChartData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                <span>{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Recent Activity table */}
            <div className="glass-panel rounded-2xl p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-slate-200">Recent Attendance Activity</h2>
                    <a href="/admin/history" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors">
                        View All logs <FiArrowRight />
                    </a>
                </div>
                <div className="overflow-x-auto">
                    <table className="glass-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Department</th>
                                <th>Check-in Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {getRecentCheckins().map((row) => (
                                <tr key={row.id}>
                                    <td className="font-semibold text-slate-100">{row.name}</td>
                                    <td>{row.department}</td>
                                    <td>{row.time}</td>
                                    <td>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                            row.status === 'Present' 
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                        }`}>
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {getRecentCheckins().length === 0 && (
                                <tr>
                                    <td colSpan="4" className="text-center text-slate-500 py-8">
                                        No recent attendance check-ins found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}

export default AdminDashboard;