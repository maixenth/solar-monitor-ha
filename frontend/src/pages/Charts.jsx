import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar, TrendingUp, PieChartIcon } from "lucide-react";
import toast from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const Charts = () => {
  const [period, setPeriod] = useState("today");
  const [chartData, setChartData] = useState([]);
  const [performanceData, setPerformanceData] = useState(null);
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
      setChartData(res.data.chart_data || []);
      
      // Calculer les données de performance
      const solarEnergy = res.data.total_solar_energy || 0;
      const gridImport = res.data.total_grid_import || 0;
      const totalConsumption = solarEnergy + gridImport;
      
      const performance = {
        autoconsommation: solarEnergy,
        reseau: gridImport,
        autosuffisance: totalConsumption > 0 ? (solarEnergy / totalConsumption * 100) : 0,
        total: totalConsumption
      };
      
      setPerformanceData(performance);
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

  const pieData = performanceData ? [
    { name: 'Autoconsommation Solaire', value: performanceData.autoconsommation, color: '#10b981' },
    { name: 'Consommation Réseau', value: performanceData.reseau, color: '#ef4444' }
  ] : [];

  const COLORS = ['#10b981', '#ef4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8 page-enter" data-testid="charts-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold mb-2 gradient-text" data-testid="charts-title">
          Graphiques & Analyses
        </h1>
        <p className="text-base text-slate-600">Visualisation détaillée de votre production et consommation</p>
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

        {/* Custom Date Picker */}
        {showCustomPicker && (
          <div className="flex items-center gap-2 ml-4 p-3 bg-white rounded-lg shadow-md border border-slate-200">
            <div>
              <label className="text-xs text-slate-600 block mb-1">Début</label>
              <DatePicker
                selected={customStartDate}
                onChange={(date) => setCustomStartDate(date)}
                dateFormat="dd/MM/yyyy"
                className="px-3 py-2 border border-slate-300 rounded text-sm"
                data-testid="custom-start-date"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Fin</label>
              <DatePicker
                selected={customEndDate}
                onChange={(date) => setCustomEndDate(date)}
                dateFormat="dd/MM/yyyy"
                className="px-3 py-2 border border-slate-300 rounded text-sm"
                data-testid="custom-end-date"
              />
            </div>
            <Button
              onClick={handleCustomDateApply}
              className="bg-emerald-500 hover:bg-emerald-600 text-white mt-5"
              data-testid="apply-custom-dates"
            >
              Appliquer
            </Button>
          </div>
        )}
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            <p className="text-sm font-medium text-slate-700">Autosuffisance</p>
          </div>
          <h3 className="text-3xl font-bold text-emerald-600" data-testid="autosuffisance-pct">
            {performanceData?.autosuffisance?.toFixed(1)}%
          </h3>
          <p className="text-xs text-slate-500 mt-1">Énergie solaire / Total consommé</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-lg">
          <p className="text-sm text-slate-600 mb-2">Autoconsommation Solaire</p>
          <h3 className="text-2xl font-bold text-blue-600" data-testid="solar-consumption">
            {performanceData?.autoconsommation?.toFixed(2)} kWh
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {((performanceData?.autoconsommation / performanceData?.total * 100) || 0).toFixed(1)}% du total
          </p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-50 to-orange-50 border-red-200 shadow-lg">
          <p className="text-sm text-slate-600 mb-2">Consommation Réseau</p>
          <h3 className="text-2xl font-bold text-red-600" data-testid="grid-consumption">
            {performanceData?.reseau?.toFixed(2)} kWh
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {((performanceData?.reseau / performanceData?.total * 100) || 0).toFixed(1)}% du total
          </p>
        </Card>
      </div>

      {/* Real-time Energy Flow Chart */}
      <Card className="p-6 bg-white/80 backdrop-blur-sm mb-8" data-testid="flow-chart-card">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-emerald-600" />
          <h3 className="text-xl font-semibold text-slate-700">Flux Énergétique Temps Réel</h3>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.6}/>
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.2}/>
                </linearGradient>
                <linearGradient id="colorBattery" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6}/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2}/>
                </linearGradient>
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
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#64748b" label={{ value: 'Puissance (W)', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                labelFormatter={(value) => new Date(value).toLocaleString('fr-FR')}
                formatter={(value, name) => {
                  if (name.includes('Batterie') || name.includes('Réseau')) {
                    return [`${Math.abs(value).toFixed(0)} W`, name];
                  }
                  return [`${value.toFixed(0)} W`, name];
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="ac_power"
                stroke="#f59e0b"
                strokeWidth={3}
                fill="url(#colorSolar)"
                name="Production Solaire (W)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="battery_power"
                stroke="#2563eb"
                strokeWidth={3}
                fill="url(#colorBattery)"
                name="Batterie (W)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="grid_power"
                stroke="#dc2626"
                strokeWidth={3}
                fill="url(#colorGrid)"
                name="Réseau (W)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Performance Pie Chart */}
      <Card className="p-6 bg-white/80 backdrop-blur-sm" data-testid="performance-chart-card">
        <div className="flex items-center gap-3 mb-6">
          <PieChartIcon className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-semibold text-slate-700">Performance Énergétique - Répartition</h3>
        </div>
        <div className="flex justify-center">
          <div className="h-[400px] w-full max-w-2xl">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent, value }) => `${name}: ${(percent * 100).toFixed(1)}% (${value.toFixed(1)} kWh)`}
                  outerRadius={140}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toFixed(2)} kWh`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Charts;