import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar, Zap, Home, Leaf, TrendingUp, TrendingDown, Battery, Sun, Plug } from "lucide-react";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const Statistics = () => {
  const [period, setPeriod] = useState("week");
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `${API}/statistics/period?period=${period}`;
      
      if (period === "custom" && showCustomPicker) {
        const startISO = customStartDate.toISOString();
        const endISO = customEndDate.toISOString();
        url = `${API}/statistics/period?start_date=${startISO}&end_date=${endISO}`;
      }

      const res = await axios.get(url);
      setStats(res.data);
      setChartData(res.data.chart_data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur de chargement");
      setLoading(false);
    }
  };

  const handleCustomDateApply = () => {
    setShowCustomPicker(false);
    fetchData();
  };

  const periods = [
    { value: "today", label: "Aujourd'hui" },
    { value: "yesterday", label: "Hier" },
    { value: "week", label: "Semaine" },
    { value: "month", label: "Mois" },
    { value: "year", label: "Année" },
    { value: "custom", label: "Personnalisé" }
  ];

  // Calculer économie CO2 (0.5 kg CO2/kWh économisé)
  const co2Saved = (stats?.total_solar_energy || 0) * 0.5;

  // Calculer consommation totale
  const totalConsumption = (stats?.total_solar_energy || 0) + (stats?.total_grid_import || 0) - (stats?.total_grid_export || 0);

  // Calculer autosuffisance
  const autosuffisance = totalConsumption > 0 ? ((stats?.total_solar_energy || 0) / totalConsumption * 100) : 0;

  // Calculer tendances (comparaison avec période précédente)
  const productionChange = stats?.production_change || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8 page-enter" data-testid="statistics-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold mb-2 gradient-text" data-testid="statistics-title">
          Statistiques Détaillées
        </h1>
        <p className="text-base text-slate-600">Analyse complète de votre performance énergétique</p>
      </div>

      {/* Period Selector */}
      <div className="flex flex-wrap gap-2 mb-8 items-center">
        {periods.map((p) => (
          <Button
            key={p.value}
            onClick={() => {
              setPeriod(p.value);
              if (p.value === "custom") {
                setShowCustomPicker(true);
              } else {
                setShowCustomPicker(false);
              }
            }}
            variant={period === p.value ? "default" : "outline"}
            className={period === p.value ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
            data-testid={`period-${p.value}`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            {p.label}
          </Button>
        ))}

        {showCustomPicker && (
          <div className="flex items-center gap-2 ml-4 p-3 bg-white rounded-lg shadow-md border border-slate-200">
            <div>
              <label className="text-xs text-slate-600 block mb-1">Début</label>
              <DatePicker
                selected={customStartDate}
                onChange={(date) => setCustomStartDate(date)}
                dateFormat="dd/MM/yyyy"
                className="px-3 py-2 border border-slate-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Fin</label>
              <DatePicker
                selected={customEndDate}
                onChange={(date) => setCustomEndDate(date)}
                dateFormat="dd/MM/yyyy"
                className="px-3 py-2 border border-slate-300 rounded text-sm"
              />
            </div>
            <Button
              onClick={handleCustomDateApply}
              className="bg-emerald-500 hover:bg-emerald-600 text-white mt-5"
            >
              Appliquer
            </Button>
          </div>
        )}
      </div>

      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-orange-200 shadow-lg" data-testid="production-card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-slate-600 mb-1">Production Solaire</p>
              <h3 className="text-3xl font-bold text-orange-600" data-testid="production-value">
                {stats?.total_solar_energy?.toFixed(1) || 0}
                <span className="text-lg ml-1">kWh</span>
              </h3>
              {productionChange !== 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {productionChange > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-xs font-medium ${productionChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(productionChange).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <Sun className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-lg" data-testid="consumption-card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-slate-600 mb-1">Consommation Totale</p>
              <h3 className="text-3xl font-bold text-blue-600" data-testid="consumption-value">
                {totalConsumption.toFixed(1)}
                <span className="text-lg ml-1">kWh</span>
              </h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Home className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 shadow-lg" data-testid="autosuffisance-card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-slate-600 mb-1">Autosuffisance</p>
              <h3 className="text-3xl font-bold text-emerald-600" data-testid="autosuffisance-value">
                {autosuffisance.toFixed(1)}
                <span className="text-lg ml-1">%</span>
              </h3>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${autosuffisance}%` }}
                ></div>
              </div>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl">
              <Zap className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-teal-50 border-green-200 shadow-lg" data-testid="co2-card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-slate-600 mb-1">Économie CO₂</p>
              <h3 className="text-3xl font-bold text-green-600" data-testid="co2-value">
                {co2Saved.toFixed(1)}
                <span className="text-lg ml-1">kg</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ≈ {(co2Saved / 0.5).toFixed(0)} arbres plantés
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Leaf className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Données Historiques */}
      <h2 className="text-2xl font-bold text-slate-800 mb-4">Données Historiques</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Production PV */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm" data-testid="pv-production-card">
          <div className="flex items-center gap-3 mb-4">
            <Sun className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-slate-700">Production Solaire PV</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-sm text-slate-600">Énergie produite:</span>
              <span className="text-lg font-bold text-orange-600">{stats?.total_solar_energy?.toFixed(2)} kWh</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Puissance moyenne:</span>
              <span className="text-lg font-bold text-slate-700">{stats?.avg_power?.toFixed(0)} W</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Puissance pic:</span>
              <span className="text-lg font-bold text-slate-700">{stats?.peak_power?.toFixed(0)} W</span>
            </div>
          </div>
        </Card>

        {/* Batterie */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm" data-testid="battery-card">
          <div className="flex items-center gap-3 mb-4">
            <Battery className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-700">Batterie</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm text-slate-600">Énergie chargée:</span>
              <span className="text-lg font-bold text-green-600">{stats?.total_battery_charge?.toFixed(2)} kWh</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-sm text-slate-600">Énergie déchargée:</span>
              <span className="text-lg font-bold text-orange-600">{stats?.total_battery_discharge?.toFixed(2)} kWh</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-slate-600">Efficacité batterie:</span>
              <span className="text-lg font-bold text-blue-600">
                {stats?.total_battery_charge > 0 ? ((stats?.total_battery_discharge / stats?.total_battery_charge * 100) || 0).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </Card>

        {/* Réseau */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm" data-testid="grid-card">
          <div className="flex items-center gap-3 mb-4">
            <Plug className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-slate-700">Réseau Électrique</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
              <span className="text-sm text-slate-600">Énergie importée:</span>
              <span className="text-lg font-bold text-red-600">{stats?.total_grid_import?.toFixed(2)} kWh</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm text-slate-600">Énergie exportée:</span>
              <span className="text-lg font-bold text-purple-600">{stats?.total_grid_export?.toFixed(2)} kWh</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Bilan réseau:</span>
              <span className={`text-lg font-bold ${(stats?.total_grid_import - stats?.total_grid_export) > 0 ? 'text-red-600' : 'text-purple-600'}`}>
                {((stats?.total_grid_import || 0) - (stats?.total_grid_export || 0)).toFixed(2)} kWh
              </span>
            </div>
          </div>
        </Card>

        {/* Performance */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm" data-testid="performance-card">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-slate-700">Performance Système</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
              <span className="text-sm text-slate-600">Rendement moyen:</span>
              <span className="text-lg font-bold text-emerald-600">{stats?.avg_efficiency?.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Temps fonctionnement:</span>
              <span className="text-lg font-bold text-slate-700">{stats?.runtime_hours?.toFixed(1)} h</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Taux d'utilisation:</span>
              <span className="text-lg font-bold text-slate-700">
                {((stats?.runtime_hours / 24) * 100 || 0).toFixed(0)}%
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Tendances et Évolutions */}
      <h2 className="text-2xl font-bold text-slate-800 mb-4">Tendances & Évolutions</h2>

      {/* Graphiques de tendances - 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Production Solaire */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm" data-testid="trend-production-chart">
          <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Sun className="w-5 h-5 text-orange-600" />
            Évolution Production Solaire
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    if (period === 'today' || period === 'yesterday') {
                      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    }
                    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                  }}
                  stroke="#64748b"
                  style={{ fontSize: '11px' }}
                />
                <YAxis stroke="#64748b" label={{ value: 'W', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleString('fr-FR')}
                  formatter={(value) => [`${value.toFixed(0)} W`, 'Production']}
                />
                <Area type="monotone" dataKey="ac_power" stroke="#f59e0b" strokeWidth={2} fill="url(#colorProduction)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Batterie */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm" data-testid="trend-battery-chart">
          <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Battery className="w-5 h-5 text-blue-600" />
            Évolution Batterie
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    if (period === 'today' || period === 'yesterday') {
                      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    }
                    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                  }}
                  stroke="#64748b"
                  style={{ fontSize: '11px' }}
                />
                <YAxis yAxisId="left" stroke="#3b82f6" label={{ value: 'W', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" label={{ value: '%', angle: 90, position: 'insideRight' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleString('fr-FR')}
                  formatter={(value, name) => {
                    if (name === 'Puissance (W)') return [`${Math.abs(value).toFixed(0)} W`, name];
                    return [`${value.toFixed(0)}%`, name];
                  }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="battery_power" stroke="#3b82f6" strokeWidth={2} name="Puissance (W)" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="battery_soc" stroke="#10b981" strokeWidth={2} name="Niveau (%)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Réseau */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm" data-testid="trend-grid-chart">
          <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Plug className="w-5 h-5 text-red-600" />
            Évolution Réseau (Import/Export)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorGrid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    if (period === 'today' || period === 'yesterday') {
                      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    }
                    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                  }}
                  stroke="#64748b"
                  style={{ fontSize: '11px' }}
                />
                <YAxis stroke="#64748b" label={{ value: 'W', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleString('fr-FR')}
                  formatter={(value) => {
                    const absValue = Math.abs(value).toFixed(0);
                    const type = value > 0 ? 'Import' : 'Export';
                    return [`${absValue} W (${type})`, 'Réseau'];
                  }}
                />
                <Area type="monotone" dataKey="grid_power" stroke="#ef4444" strokeWidth={2} fill="url(#colorGrid)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Consommation totale (calculée) */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm" data-testid="trend-consumption-chart">
          <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Home className="w-5 h-5 text-purple-600" />
            Évolution Consommation Maison
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    if (period === 'today' || period === 'yesterday') {
                      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                    }
                    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                  }}
                  stroke="#64748b"
                  style={{ fontSize: '11px' }}
                />
                <YAxis stroke="#64748b" label={{ value: 'W', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  labelFormatter={(value) => new Date(value).toLocaleString('fr-FR')}
                  formatter={(value, name, props) => {
                    const reading = props.payload;
                    const consumption = (reading.ac_power || 0) + Math.abs(reading.battery_power || 0) + (reading.grid_power > 0 ? reading.grid_power : 0);
                    return [`${consumption.toFixed(0)} W`, 'Consommation'];
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey={(data) => {
                    return (data.ac_power || 0) + Math.abs(data.battery_power || 0) + (data.grid_power > 0 ? data.grid_power : 0);
                  }}
                  stroke="#8b5cf6" 
                  strokeWidth={2} 
                  fill="url(#colorConsumption)" 
                  dot={false} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Comparaison et insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200" data-testid="trend-production">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            <h3 className="text-lg font-semibold text-slate-700">Tendance Production</h3>
          </div>
          <p className="text-3xl font-bold text-emerald-600 mb-2">
            {productionChange >= 0 ? '+' : ''}{productionChange.toFixed(1)}%
          </p>
          <p className="text-sm text-slate-600">vs période précédente</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200" data-testid="trend-autosuffisance">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-700">Objectif Autosuffisance</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-2">
            {autosuffisance >= 80 ? '✅' : autosuffisance >= 60 ? '🟡' : '🔴'} {autosuffisance.toFixed(0)}%
          </p>
          <p className="text-sm text-slate-600">
            {autosuffisance >= 80 ? 'Excellent!' : autosuffisance >= 60 ? 'Bien' : 'Améliorable'}
          </p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-teal-50 border-green-200" data-testid="trend-co2">
          <div className="flex items-center gap-3 mb-3">
            <Leaf className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-slate-700">Impact Environnemental</h3>
          </div>
          <p className="text-3xl font-bold text-green-600 mb-2">
            {co2Saved.toFixed(0)} kg
          </p>
          <p className="text-sm text-slate-600">CO₂ évité</p>
        </Card>
      </div>
    </div>
  );
};

export default Statistics;