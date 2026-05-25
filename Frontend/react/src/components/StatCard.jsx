/**
 * StatCard – A reusable metric card for the dashboard.
 * Props:
 *   label      – Metric label text (string)
 *   value      – Numeric or string value to display (string|number)
 *   icon       – React icon element
 *   color      – Tailwind color key: 'indigo' | 'emerald' | 'rose' | 'amber'
 *   trend      – Optional trend text like "+12% vs last week"
 */
const colorMap = {
  indigo: {
    value: "text-white",
    icon: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
  },
  emerald: {
    value: "text-emerald-400",
    icon: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  },
  rose: {
    value: "text-rose-400",
    icon: "bg-rose-500/10 border-rose-500/20 text-rose-400",
  },
  amber: {
    value: "text-amber-400",
    icon: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  },
};

function StatCard({ label, value, icon, color = "indigo", trend }) {
  const colors = colorMap[color] || colorMap.indigo;

  return (
    <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colors.icon}`}>
          {icon}
        </div>
      </div>

      <div>
        <span className={`text-3xl font-extrabold ${colors.value}`}>
          {value ?? "—"}
        </span>
        {trend && (
          <p className="text-xs text-slate-500 mt-1">{trend}</p>
        )}
      </div>
    </div>
  );
}

export default StatCard;
