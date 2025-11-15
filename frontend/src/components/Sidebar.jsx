import { NavLink } from "react-router-dom";
import { Home, Settings, Sun, BarChart3, LineChart, Activity } from "lucide-react";

const Sidebar = () => {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white/90 backdrop-blur-lg border-r border-slate-200 shadow-lg z-50" data-testid="sidebar">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-gradient-to-br from-emerald-400 to-amber-400 rounded-xl">
            <Sun className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold gradient-text" data-testid="sidebar-title">Solar Monitor</h1>
        </div>

        <nav className="space-y-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive
                  ? "bg-emerald-100 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`
            }
            data-testid="nav-dashboard"
          >
            <Home className="w-5 h-5" />
            Dashboard
          </NavLink>

          <NavLink
            to="/charts"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive
                  ? "bg-emerald-100 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`
            }
            data-testid="nav-charts"
          >
            <LineChart className="w-5 h-5" />
            Graphiques
          </NavLink>

          <NavLink
            to="/statistics"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive
                  ? "bg-emerald-100 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`
            }
            data-testid="nav-statistics"
          >
            <BarChart3 className="w-5 h-5" />
            Statistiques
          </NavLink>

          <NavLink
            to="/inverters"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive
                  ? "bg-emerald-100 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`
            }
            data-testid="nav-inverters"
          >
            <Activity className="w-5 h-5" />
            Onduleurs
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive
                  ? "bg-emerald-100 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`
            }
            data-testid="nav-settings"
          >
            <Settings className="w-5 h-5" />
            Paramètres
          </NavLink>
        </nav>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-200">
        <div className="text-xs text-slate-500">
          <p className="font-medium mb-1">Solar Monitoring System</p>
          <p>GROWATT • MPPSOLAR</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;