import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API } from "../App";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowLeft, Zap, Battery, Gauge, Thermometer } from "lucide-react";
import toast from "react-hot-toast";

const InverterDetail = () => {
  const { id } = useParams();
  const [inverter, setInverter] = useState(null);
  const [reading, setReading] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [period, setPeriod] = useState("today");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchRealtimeData, 5000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    fetchChartData();
  }, [id, period]);

  const fetchData = async () => {
    try {
      const [invRes, readRes] = await Promise.all([
        axios.get(`${API}/inverters/${id}`),
        axios.get(`${API}/inverters/${id}/realtime`)
      ]);
      setInverter(invRes.data);
      setReading(readRes.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur de chargement");
      setLoading(false);
    }
  };

  const fetchRealtimeData = async () => {
    try {
      const res = await axios.get(`${API}/inverters/${id}/realtime`);
      setReading(res.data);
    } catch (error) {
      console.error("Error fetching realtime data:", error);
    }
  };

  const fetchChartData = async () => {
    try {
      const res = await axios.get(`${API}/dashboard/chart-data/${id}?period=${period}`);
      setChartData(res.data);
    } catch (error) {
      console.error("Error fetching chart data:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!inverter) {
    return (
      <div className="p-8">
        <Card className="p-12 text-center" data-testid="inverter-not-found">
          <h2 className="text-2xl font-bold text-slate-700 mb-2">Onduleur introuvable</h2>
          <a href="/inverters" className="text-emerald-600 hover:text-emerald-700" data-testid="back-to-inverters">Retour à la liste</a>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 page-enter" data-testid="inverter-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <a href="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors" data-testid="back-button">
          <ArrowLeft className="w-6 h-6 text-slate-600" />
        </a>
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold gradient-text" data-testid="inverter-detail-name">{inverter.name}</h1>
          <p className="text-base text-slate-600">{inverter.brand} • {inverter.connection_type}</p>
        </div>
      </div>

      {/* Real-time Metrics */}
      {reading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-emerald-100 shadow-lg" data-testid="ac-power-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Puissance AC</p>
                <h3 className="text-3xl font-bold text-emerald-600" data-testid="detail-ac-power">
                  {reading.ac_power?.toFixed(0)}
                  <span className="text-lg ml-1">W</span>
                </h3>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Zap className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-sm border-blue-100 shadow-lg" data-testid="dc-power-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Puissance DC</p>
                <h3 className="text-3xl font-bold text-blue-600" data-testid="detail-dc-power">
                  {reading.dc_power?.toFixed(0)}
                  <span className="text-lg ml-1">W</span>
                </h3>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Battery className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-100 shadow-lg" data-testid="voltage-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Tension AC</p>
                <h3 className="text-3xl font-bold text-amber-600" data-testid="detail-ac-voltage">
                  {reading.ac_voltage?.toFixed(1)}
                  <span className="text-lg ml-1">V</span>
                </h3>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Gauge className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg" data-testid="temp-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Température</p>
                <h3 className="text-3xl font-bold text-slate-700" data-testid="detail-temperature">
                  {reading.temperature?.toFixed(1)}
                  <span className="text-lg ml-1">°C</span>
                </h3>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl">
                <Thermometer className="w-6 h-6 text-slate-700" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Additional Metrics */}
      {reading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-white/80 backdrop-blur-sm" data-testid="current-metrics-card">
            <h3 className="font-semibold text-slate-700 mb-4">Courants</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Courant AC:</span>
                <span className="font-semibold" data-testid="detail-ac-current">{reading.ac_current?.toFixed(2)} A</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Courant DC:</span>
                <span className="font-semibold" data-testid="detail-dc-current">{reading.dc_current?.toFixed(2)} A</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Fréquence:</span>
                <span className="font-semibold" data-testid="detail-frequency">{reading.frequency?.toFixed(2)} Hz</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-sm" data-testid="energy-metrics-card">
            <h3 className="font-semibold text-slate-700 mb-4">Énergie</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Aujourd'hui:</span>
                <span className="font-semibold" data-testid="detail-energy-today">{reading.energy_today?.toFixed(2)} kWh</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Total:</span>
                <span className="font-semibold" data-testid="detail-energy-total">{reading.energy_total?.toFixed(0)} kWh</span>
              </div>
            </div>
          </Card>

          {reading.battery_soc && (
            <Card className="p-6 bg-white/80 backdrop-blur-sm" data-testid="battery-metrics-card">
              <h3 className="font-semibold text-slate-700 mb-4">Batterie</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">État de charge:</span>
                  <span className="font-semibold" data-testid="detail-battery-soc">{reading.battery_soc?.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Tension:</span>
                  <span className="font-semibold" data-testid="detail-battery-voltage">{reading.battery_voltage?.toFixed(2)} V</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Courant:</span>
                  <span className="font-semibold" data-testid="detail-battery-current">{reading.battery_current?.toFixed(2)} A</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Charts */}
      <Card className="p-6 bg-white/80 backdrop-blur-sm" data-testid="charts-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-700">Historique de Production</h3>
          <div className="flex gap-2">
            <Button
              onClick={() => setPeriod("today")}
              variant={period === "today" ? "default" : "outline"}
              className={period === "today" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
              data-testid="period-today-button"
            >
              Aujourd'hui
            </Button>
            <Button
              onClick={() => setPeriod("week")}
              variant={period === "week" ? "default" : "outline"}
              className={period === "week" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
              data-testid="period-week-button"
            >
              Semaine
            </Button>
            <Button
              onClick={() => setPeriod("month")}
              variant={period === "month" ? "default" : "outline"}
              className={period === "month" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
              data-testid="period-month-button"
            >
              Mois
            </Button>
          </div>
        </div>

        <div className="h-80" data-testid="power-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                stroke="#64748b"
              />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                labelFormatter={(value) => new Date(value).toLocaleString('fr-FR')}
              />
              <Area
                type="monotone"
                dataKey="ac_power"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorPower)"
                name="Puissance AC (W)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default InverterDetail;