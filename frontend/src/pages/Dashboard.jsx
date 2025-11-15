import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Card } from "@/components/ui/card";
import { Battery, Clock } from "lucide-react";
import toast from "react-hot-toast";
import EnergyFlowDiagram from "@/components/EnergyFlowDiagram";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [inverters, setInverters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, invertersRes, dailyRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/inverters`),
        axios.get(`${API}/statistics/period?period=today`)
      ]);
      setStats(statsRes.data);
      setInverters(invertersRes.data);
      setDailyStats(dailyRes.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur de chargement");
      setLoading(false);
    }
  };

  // Calculer l'autonomie
  const calculateAutonomy = () => {
    if (!stats || stats.total_battery_power >= 0) {
      return { status: 'charge', hours: 0 };
    }

    // Capacité totale des batteries (à partir des onduleurs)
    const totalCapacity = inverters.reduce((sum, inv) => sum + (inv.battery_capacity || 0), 0);
    
    if (totalCapacity === 0 || stats.battery_soc === 0) {
      return { status: 'unknown', hours: 0 };
    }

    // Énergie disponible en kWh
    const availableEnergy = (totalCapacity * stats.battery_soc) / 100;
    
    // Consommation actuelle en kW
    const currentLoad = Math.abs(stats.total_battery_power) / 1000;
    
    if (currentLoad === 0) {
      return { status: 'idle', hours: 0 };
    }

    // Autonomie en heures
    const autonomyHours = availableEnergy / currentLoad;
    
    return { status: 'discharging', hours: autonomyHours };
  };

  const autonomy = calculateAutonomy();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8 page-enter" data-testid="dashboard-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold mb-2 gradient-text" data-testid="dashboard-title">
          Monitoring Solaire - Temps Réel
        </h1>
        <p className="text-base text-slate-600">Flux énergétique et consommation en direct</p>
      </div>

      {/* Energy Flow Diagram */}
      <div className="mb-8">
        <EnergyFlowDiagram
          solarPower={stats?.total_solar_power || 0}
          batteryPower={stats?.total_battery_power || 0}
          gridPower={stats?.total_grid_power || 0}
          loadPower={stats?.total_load_power || 0}
        />
      </div>

      {/* Real-time Metrics */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Métriques Temps Réel & Journalières</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Niveau Batterie */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm border-blue-100 shadow-lg" data-testid="battery-card">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="text-sm text-slate-600 mb-2">Niveau Batterie</p>
              <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-3xl font-bold text-blue-600" data-testid="battery-soc">
                  {stats?.battery_soc?.toFixed(0) || 0}%
                </h3>
                <span className="text-sm text-slate-500">
                  {stats?.total_battery_power > 0 ? '⚡ Charge' : stats?.total_battery_power < 0 ? '⚡ Décharge' : '⏸ Arrêt'}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${stats?.battery_soc || 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500">
                Temps réel: {Math.abs(stats?.total_battery_power || 0).toFixed(0)}W
              </p>
            </div>
            <Battery className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        {/* Production Solaire */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm border-emerald-100 shadow-lg" data-testid="solar-card">
          <div>
            <p className="text-sm text-slate-600 mb-2">Production Solaire</p>
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-1">Temps réel</p>
              <h3 className="text-2xl font-bold text-emerald-600" data-testid="solar-power-realtime">
                {stats?.total_solar_power?.toFixed(0) || 0} W
              </h3>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Aujourd'hui</p>
              <h3 className="text-xl font-bold text-emerald-700" data-testid="solar-energy-today">
                {dailyStats?.total_solar_energy?.toFixed(2) || 0} kWh
              </h3>
            </div>
          </div>
        </Card>

        {/* Réseau */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-100 shadow-lg" data-testid="grid-card">
          <div>
            <p className="text-sm text-slate-600 mb-2">Réseau Électrique</p>
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-1">Temps réel</p>
              <h3 className="text-2xl font-bold text-amber-600" data-testid="grid-power-realtime">
                {Math.abs(stats?.total_grid_power || 0).toFixed(0)} W
                <span className="text-sm ml-2">{stats?.total_grid_power > 0 ? '⬇ Import' : '⬆ Export'}</span>
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-slate-500 mb-1">Import jour</p>
                <p className="text-sm font-semibold text-red-600" data-testid="grid-import-today">
                  {dailyStats?.total_grid_import?.toFixed(2) || 0} kWh
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Export jour</p>
                <p className="text-sm font-semibold text-purple-600" data-testid="grid-export-today">
                  {dailyStats?.total_grid_export?.toFixed(2) || 0} kWh
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Consommation Maison */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm border-purple-100 shadow-lg" data-testid="load-card">
          <div>
            <p className="text-sm text-slate-600 mb-2">Consommation Maison</p>
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-1">Temps réel</p>
              <h3 className="text-2xl font-bold text-purple-600" data-testid="load-power-realtime">
                {stats?.total_load_power?.toFixed(0) || 0} W
              </h3>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Aujourd'hui (estimé)</p>
              <h3 className="text-xl font-bold text-purple-700" data-testid="load-energy-today">
                {((dailyStats?.total_solar_energy || 0) + (dailyStats?.total_grid_import || 0) - (dailyStats?.total_grid_export || 0)).toFixed(2)} kWh
              </h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Autonomie */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-lg mb-8" data-testid="autonomy-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white rounded-xl shadow-md">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Autonomie Batterie</p>
              {autonomy.status === 'charge' && (
                <h3 className="text-2xl font-bold text-green-600" data-testid="autonomy-status">
                  🔋 En charge
                </h3>
              )}
              {autonomy.status === 'discharging' && (
                <div>
                  <h3 className="text-3xl font-bold text-blue-600" data-testid="autonomy-hours">
                    {autonomy.hours.toFixed(1)} heures
                  </h3>
                  <p className="text-sm text-slate-500">
                    Basé sur la consommation actuelle de {Math.abs(stats?.total_battery_power || 0).toFixed(0)}W
                  </p>
                </div>
              )}
              {autonomy.status === 'unknown' && (
                <p className="text-lg text-slate-500" data-testid="autonomy-unknown">
                  Configurez la capacité des batteries dans l'onglet Onduleurs
                </p>
              )}
              {autonomy.status === 'idle' && (
                <h3 className="text-2xl font-bold text-slate-600" data-testid="autonomy-idle">
                  ⏸ En veille
                </h3>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-1">Capacité totale</p>
            <p className="text-lg font-bold text-slate-700">
              {inverters.reduce((sum, inv) => sum + (inv.battery_capacity || 0), 0).toFixed(1)} kWh
            </p>
            <p className="text-xs text-slate-500 mt-2">Énergie disponible</p>
            <p className="text-lg font-bold text-blue-600">
              {((inverters.reduce((sum, inv) => sum + (inv.battery_capacity || 0), 0) * (stats?.battery_soc || 0)) / 100).toFixed(2)} kWh
            </p>
          </div>
        </div>
      </Card>

      {/* Mode de gestion */}
      <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md border border-slate-200">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            stats?.current_source === 'solar' ? 'bg-emerald-500' :
            stats?.current_source === 'battery' ? 'bg-blue-500' :
            stats?.current_source === 'grid' ? 'bg-amber-500' : 'bg-purple-500'
          } status-dot`}></div>
          <span className="text-sm font-medium text-slate-700">
            Source active: <span className="font-bold">
              {stats?.current_source === 'solar' ? 'Solaire' :
               stats?.current_source === 'battery' ? 'Batterie' :
               stats?.current_source === 'grid' ? 'Réseau' : 'Mixte'}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">
            Mode: <span className="font-semibold">{stats?.management_mode === 'automatic' ? '⚡ Automatique' : '👤 Manuel'}</span>
          </span>
          <a 
            href="/inverters" 
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm font-medium transition-colors"
            data-testid="manage-energy-link"
          >
            Gérer l'énergie →
          </a>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;