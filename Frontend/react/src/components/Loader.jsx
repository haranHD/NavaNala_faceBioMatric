/**
 * Loader – Full-page centered loading spinner.
 * Usage: <Loader /> or <Loader message="Fetching employees..." />
 */
function Loader({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="relative w-14 h-14">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10"></div>
        {/* Spinning arc */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin"></div>
        {/* Inner dot */}
        <div className="absolute inset-3 rounded-full bg-indigo-500/10 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
        {message}
      </p>
    </div>
  );
}

export default Loader;
