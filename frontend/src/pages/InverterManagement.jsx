import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Power, PowerOff, Settings, Zap, Battery, Sun, Plug, Activity } from "lucide-react";
import toast from "react-hot-toast";

const InverterManagement = () => {
  const [inverters, setInverters] = useState([]);
  const [energyConfig, setEnergyConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [realTimeData, setRealTimeData] = useState({});

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchRealTimeData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [invertersRes, configRes] = await Promise.all([
        axios.get(`${API}/inverters`),
        axios.get(`${API}/energy-management`)
      ]);
      setInverters(invertersRes.data);
      setEnergyConfig(configRes.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur de chargement");
      setLoading(false);
    }
  };

  const fetchRealTimeData = async () => {
    try {
      const invertersRes = await axios.get(`${API}/inverters`);
      const data = {};
      
      for (const inv of invertersRes.data) {
        if (inv.status === 'connected') {
          try {
            const readingRes = await axios.get(`${API}/inverters/${inv.id}/realtime`);
            data[inv.id] = readingRes.data;
          } catch (err) {
            console.error(`Error fetching reading for ${inv.id}:`, err);
          }
        }
      }
      
      setRealTimeData(data);
    } catch (error) {
      console.error("Error fetching real-time data:", error);
    }
  };

  const handleUpdateEnergyConfig = async (updates) => {
    try {
      await axios.put(`${API}/energy-management`, updates);
      toast.success("Configuration mise à jour");
      fetchData();
    } catch (error) {
      console.error("Error updating config:", error);
      toast.error("Erreur de mise à jour");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet onduleur?")) return;
    
    try {
      await axios.delete(`${API}/inverters/${id}`);
      toast.success("Onduleur supprimé");
      fetchData();
    } catch (error) {
      console.error("Error deleting inverter:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "connected" ? "disconnected" : "connected";
    try {
      await axios.put(`${API}/inverters/${id}/status?status=${newStatus}`);
      toast.success(`Onduleur ${newStatus === "connected" ? "connecté" : "déconnecté"}`);
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erreur de mise à jour");
    }
  };

  const handleScanInverters = async () => {
    toast.loading("🔍 Scan des onduleurs en cours...", { duration: 2000 });
    try {
      const res = await axios.post(`${API}/inverters/scan`);
      toast.success(`✅ Scan terminé: ${res.data.added_count} onduleurs ajoutés`);
      fetchData();
    } catch (error) {
      console.error("Error scanning inverters:", error);
      toast.error("Erreur lors du scan");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8 page-enter" data-testid="inverter-management-page">
      <div className="mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold mb-2 gradient-text" data-testid="management-title">
          Gestion Onduleurs & Énergie
        </h1>
        <p className="text-base text-slate-600">Configuration système et monitoring temps réel</p>
      </div>

      <Tabs defaultValue="control" className="mb-8">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid" data-testid="tabs">
          <TabsTrigger value="control" data-testid="tab-control">
            <Settings className="w-4 h-4 mr-2" />
            Contrôle du Système
          </TabsTrigger>
          <TabsTrigger value="inverters" data-testid="tab-inverters">
            <Activity className="w-4 h-4 mr-2" />
            Onduleurs Temps Réel
          </TabsTrigger>
        </TabsList>

        {/* Contrôle du Système */}
        <TabsContent value="control" className="mt-6">
          <EnergyControlPanel 
            config={energyConfig} 
            onUpdate={handleUpdateEnergyConfig}
            inverters={inverters}
            onRefresh={fetchData}
          />
        </TabsContent>

        {/* Onduleurs Temps Réel */}
        <TabsContent value="inverters" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Onduleurs en Temps Réel</h2>
            <div className="flex gap-3">
              <Button 
                onClick={handleScanInverters}
                className="bg-blue-500 hover:bg-blue-600 text-white" 
                data-testid="scan-inverters-button"
              >
                <Activity className="w-4 h-4 mr-2 animate-pulse" />
                Scanner automatiquement
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="add-inverter-button">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter manuellement
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Nouvel Onduleur</DialogTitle>
                  </DialogHeader>
                  <AddInverterForm onSuccess={() => {
                    setIsAddDialogOpen(false);
                    fetchData();
                  }} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {inverters.map((inverter) => (
              <InverterCard 
                key={inverter.id} 
                inverter={inverter}
                realTimeData={realTimeData[inverter.id]}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </div>

          {inverters.length === 0 && (
            <Card className="p-12 bg-white/80 backdrop-blur-sm text-center">
              <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">Aucun onduleur configuré</h3>
              <p className="text-slate-600">Cliquez sur "Ajouter un onduleur" pour commencer</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Composant Contrôle du Système
const EnergyControlPanel = ({ config, onUpdate, inverters, onRefresh }) => {
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  if (!localConfig) return null;

  const handleModeChange = () => {
    const newMode = localConfig.mode === 'automatic' ? 'manual' : 'automatic';
    setLocalConfig({ ...localConfig, mode: newMode });
    onUpdate({ mode: newMode });
  };

  const handleManualSourceChange = (source) => {
    setLocalConfig({ ...localConfig, manual_source: source });
    onUpdate({ manual_source: source });
  };

  const handlePriorityChange = (priority) => {
    setLocalConfig({ ...localConfig, priority_order: priority });
    onUpdate({ priority_order: priority });
  };

  const handleRuleUpdate = (key, value) => {
    setLocalConfig({ ...localConfig, [key]: value });
    onUpdate({ [key]: value });
  };

  const totalBatteryCapacity = inverters.reduce((sum, inv) => sum + (inv.battery_capacity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Mode de fonctionnement */}
      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200" data-testid="mode-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Mode de Fonctionnement</h3>
            <p className="text-sm text-slate-600">Choisissez comment le système gère les sources d'énergie</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${localConfig.mode === 'manual' ? 'text-slate-700' : 'text-slate-400'}`}>Manuel</span>
            <Switch
              checked={localConfig.mode === 'automatic'}
              onCheckedChange={handleModeChange}
              data-testid="mode-switch"
            />
            <span className={`text-sm font-medium ${localConfig.mode === 'automatic' ? 'text-emerald-700' : 'text-slate-400'}`}>Automatique</span>
          </div>
        </div>

        {localConfig.mode === 'automatic' ? (
          <div className="p-4 bg-emerald-100 rounded-lg">
            <p className="text-sm text-emerald-800">
              ✓ Le système sélectionne automatiquement la meilleure source selon vos priorités et règles configurées.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Label>Sélection source manuelle:</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={() => handleManualSourceChange('solar')}
                variant={localConfig.manual_source === 'solar' ? 'default' : 'outline'}
                className={localConfig.manual_source === 'solar' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                data-testid="manual-solar"
              >
                <Sun className="w-4 h-4 mr-2" />
                Solaire
              </Button>
              <Button
                onClick={() => handleManualSourceChange('battery')}
                variant={localConfig.manual_source === 'battery' ? 'default' : 'outline'}
                className={localConfig.manual_source === 'battery' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                data-testid="manual-battery"
              >
                <Battery className="w-4 h-4 mr-2" />
                Batterie
              </Button>
              <Button
                onClick={() => handleManualSourceChange('grid')}
                variant={localConfig.manual_source === 'grid' ? 'default' : 'outline'}
                className={localConfig.manual_source === 'grid' ? 'bg-red-500 hover:bg-red-600' : ''}
                data-testid="manual-grid"
              >
                <Plug className="w-4 h-4 mr-2" />
                Réseau
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Priorités (uniquement en mode automatique) */}
      {localConfig.mode === 'automatic' && (
        <Card className="p-6 bg-white/80 backdrop-blur-sm" data-testid="priority-card">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Ordre de Priorité des Sources</h3>
          <p className="text-sm text-slate-600 mb-4">Définissez l'ordre dans lequel le système utilise les sources d'énergie</p>
          
          <div className="space-y-3">
            <Label>Priorité 1 (Préférée):</Label>
            <Select value={localConfig.priority_order[0]} onValueChange={(val) => {
              const newOrder = [...localConfig.priority_order];
              newOrder[0] = val;
              handlePriorityChange(newOrder);
            }}>
              <SelectTrigger data-testid="priority-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solar"><Sun className="w-4 h-4 inline mr-2" />Solaire</SelectItem>
                <SelectItem value="battery"><Battery className="w-4 h-4 inline mr-2" />Batterie</SelectItem>
                <SelectItem value="grid"><Plug className="w-4 h-4 inline mr-2" />Réseau</SelectItem>
              </SelectContent>
            </Select>

            <Label>Priorité 2:</Label>
            <Select value={localConfig.priority_order[1]} onValueChange={(val) => {
              const newOrder = [...localConfig.priority_order];
              newOrder[1] = val;
              handlePriorityChange(newOrder);
            }}>
              <SelectTrigger data-testid="priority-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solar"><Sun className="w-4 h-4 inline mr-2" />Solaire</SelectItem>
                <SelectItem value="battery"><Battery className="w-4 h-4 inline mr-2" />Batterie</SelectItem>
                <SelectItem value="grid"><Plug className="w-4 h-4 inline mr-2" />Réseau</SelectItem>
              </SelectContent>
            </Select>

            <Label>Priorité 3 (Dernier recours):</Label>
            <Select value={localConfig.priority_order[2]} onValueChange={(val) => {
              const newOrder = [...localConfig.priority_order];
              newOrder[2] = val;
              handlePriorityChange(newOrder);
            }}>
              <SelectTrigger data-testid="priority-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solar"><Sun className="w-4 h-4 inline mr-2" />Solaire</SelectItem>
                <SelectItem value="battery"><Battery className="w-4 h-4 inline mr-2" />Batterie</SelectItem>
                <SelectItem value="grid"><Plug className="w-4 h-4 inline mr-2" />Réseau</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      )}

      {/* Règles de basculement */}
      {localConfig.mode === 'automatic' && (
        <Card className="p-6 bg-white/80 backdrop-blur-sm" data-testid="rules-card">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Règles de Basculement</h3>
          <p className="text-sm text-slate-600 mb-4">Configurez les seuils et conditions de basculement automatique</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Batterie */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                <Battery className="w-5 h-5 text-blue-600" />
                Seuils Batterie
              </h4>
              
              <div>
                <Label>Niveau minimum (basculer vers réseau si inférieur):</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={localConfig.battery_min_soc}
                    onChange={(e) => handleRuleUpdate('battery_min_soc', parseFloat(e.target.value))}
                    min="0"
                    max="100"
                    data-testid="battery-min-soc"
                  />
                  <span className="text-sm text-slate-600">%</span>
                </div>
              </div>

              <div>
                <Label>Niveau maximum (arrêter charge):</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={localConfig.battery_max_soc}
                    onChange={(e) => handleRuleUpdate('battery_max_soc', parseFloat(e.target.value))}
                    min="0"
                    max="100"
                    data-testid="battery-max-soc"
                  />
                  <span className="text-sm text-slate-600">%</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  Capacité totale: <span className="font-bold">{totalBatteryCapacity.toFixed(1)} kWh</span>
                </p>
              </div>
            </div>

            {/* Solaire */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                <Sun className="w-5 h-5 text-orange-600" />
                Seuils Solaire
              </h4>
              
              <div>
                <Label>Puissance minimum pour utiliser solaire:</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={localConfig.solar_min_power}
                    onChange={(e) => handleRuleUpdate('solar_min_power', parseFloat(e.target.value))}
                    min="0"
                    data-testid="solar-min-power"
                  />
                  <span className="text-sm text-slate-600">W</span>
                </div>
              </div>
            </div>

            {/* Réseau */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                <Plug className="w-5 h-5 text-red-600" />
                Paramètres Réseau
              </h4>
              
              <div>
                <Label>Import maximum autorisé:</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={localConfig.grid_max_import}
                    onChange={(e) => handleRuleUpdate('grid_max_import', parseFloat(e.target.value))}
                    min="0"
                    data-testid="grid-max-import"
                  />
                  <span className="text-sm text-slate-600">W</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Autoriser charge batterie par réseau:</Label>
                  <Switch
                    checked={localConfig.enable_grid_charging}
                    onCheckedChange={(val) => handleRuleUpdate('enable_grid_charging', val)}
                    data-testid="enable-grid-charging"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Autoriser export vers réseau:</Label>
                  <Switch
                    checked={localConfig.enable_grid_export}
                    onCheckedChange={(val) => handleRuleUpdate('enable_grid_export', val)}
                    data-testid="enable-grid-export"
                  />
                </div>
              </div>
            </div>

            {/* Heures de pointe */}
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-600" />
                Heures de Pointe
              </h4>
              
              <div>
                <Label>Début heures de pointe:</Label>
                <Input
                  type="time"
                  value={localConfig.peak_hours_start}
                  onChange={(e) => handleRuleUpdate('peak_hours_start', e.target.value)}
                  className="mt-2"
                  data-testid="peak-start"
                />
              </div>

              <div>
                <Label>Fin heures de pointe:</Label>
                <Input
                  type="time"
                  value={localConfig.peak_hours_end}
                  onChange={(e) => handleRuleUpdate('peak_hours_end', e.target.value)}
                  className="mt-2"
                  data-testid="peak-end"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Éviter réseau durant pointe:</Label>
                <Switch
                  checked={localConfig.avoid_grid_during_peak}
                  onCheckedChange={(val) => handleRuleUpdate('avoid_grid_during_peak', val)}
                  data-testid="avoid-peak"
                />
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

// Composant Carte Onduleur
const InverterCard = ({ inverter, realTimeData, onDelete, onToggleStatus }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'bg-emerald-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <Card className="p-6 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow" data-testid={`inverter-card-${inverter.id}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-2xl font-bold text-slate-800">{inverter.name}</h3>
            <span className={`w-3 h-3 rounded-full status-dot ${getStatusColor(inverter.status)}`}></span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="font-medium">{inverter.brand}</span>
            <span>•</span>
            <span>{inverter.connection_type}</span>
            <span>•</span>
            <span>{inverter.port}</span>
            <span>•</span>
            <span>{inverter.baudrate} baud</span>
          </div>
          {inverter.battery_capacity > 0 && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                <Battery className="w-4 h-4" />
                Capacité batterie: {inverter.battery_capacity} kWh
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => onToggleStatus(inverter.id, inverter.status)}
            className={`${inverter.status === 'connected' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white`}
            data-testid={`toggle-${inverter.id}`}
          >
            {inverter.status === 'connected' ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
          </Button>
          <Button
            onClick={() => onDelete(inverter.id)}
            variant="destructive"
            className="bg-red-500 hover:bg-red-600"
            data-testid={`delete-${inverter.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {realTimeData && inverter.status === 'connected' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {/* Production */}
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-xs text-slate-600 mb-1">Production AC</p>
            <p className="text-2xl font-bold text-orange-600">{realTimeData.ac_power?.toFixed(0)} W</p>
            <p className="text-xs text-slate-500 mt-1">{realTimeData.ac_voltage?.toFixed(1)} V</p>
          </div>

          {/* Batterie */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-slate-600 mb-1">Batterie</p>
            <p className="text-2xl font-bold text-blue-600">{realTimeData.battery_soc?.toFixed(0)}%</p>
            <p className="text-xs text-slate-500 mt-1">
              {realTimeData.battery_power > 0 ? '⬆️ Charge' : '⬇️ Décharge'} {Math.abs(realTimeData.battery_power || 0).toFixed(0)}W
            </p>
          </div>

          {/* Réseau */}
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-xs text-slate-600 mb-1">Réseau</p>
            <p className="text-2xl font-bold text-red-600">{Math.abs(realTimeData.grid_power || 0).toFixed(0)} W</p>
            <p className="text-xs text-slate-500 mt-1">
              {realTimeData.grid_power > 0 ? '⬇️ Import' : '⬆️ Export'}
            </p>
          </div>

          {/* Énergie */}
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <p className="text-xs text-slate-600 mb-1">Aujourd'hui</p>
            <p className="text-2xl font-bold text-emerald-600">{realTimeData.energy_today?.toFixed(1)} kWh</p>
            <p className="text-xs text-slate-500 mt-1">Total: {realTimeData.energy_total?.toFixed(0)} kWh</p>
          </div>

          {/* Température */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">Température</p>
            <p className="text-2xl font-bold text-slate-700">{realTimeData.temperature?.toFixed(1)}°C</p>
            <p className="text-xs text-slate-500 mt-1">Onduleur</p>
          </div>

          {/* Fréquence */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">Fréquence</p>
            <p className="text-2xl font-bold text-slate-700">{realTimeData.frequency?.toFixed(2)} Hz</p>
            <p className="text-xs text-slate-500 mt-1">AC</p>
          </div>

          {/* Courant AC */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">Courant AC</p>
            <p className="text-2xl font-bold text-slate-700">{realTimeData.ac_current?.toFixed(2)} A</p>
            <p className="text-xs text-slate-500 mt-1">{realTimeData.dc_current?.toFixed(2)} A DC</p>
          </div>

          {/* Puissance DC */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">Puissance DC</p>
            <p className="text-2xl font-bold text-slate-700">{realTimeData.dc_power?.toFixed(0)} W</p>
            <p className="text-xs text-slate-500 mt-1">{realTimeData.dc_voltage?.toFixed(1)} V</p>
          </div>
        </div>
      )}

      {inverter.status !== 'connected' && (
        <div className="mt-6 p-4 bg-slate-50 rounded-lg text-center">
          <p className="text-slate-500">Onduleur déconnecté - Aucune donnée disponible</p>
        </div>
      )}
    </Card>
  );
};

// Formulaire d'ajout
const AddInverterForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    brand: "GROWATT",
    connection_type: "USB",
    port: "/dev/ttyUSB0",
    baudrate: 9600,
    slave_id: 1,
    battery_capacity: 0
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await axios.post(`${API}/inverters`, formData);
      toast.success("Onduleur ajouté avec succès!");
      onSuccess();
    } catch (error) {
      console.error("Error creating inverter:", error);
      toast.error("Erreur lors de l'ajout");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Nom de l'onduleur</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="ex: Onduleur Garage"
          required
        />
      </div>

      <div>
        <Label>Marque</Label>
        <Select value={formData.brand} onValueChange={(value) => setFormData({ ...formData, brand: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GROWATT">GROWATT</SelectItem>
            <SelectItem value="MPPSOLAR">MPPSOLAR</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Type de connexion</Label>
        <Select value={formData.connection_type} onValueChange={(value) => setFormData({ ...formData, connection_type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USB">USB</SelectItem>
            <SelectItem value="RS485">RS485</SelectItem>
            <SelectItem value="Modbus">Modbus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Port</Label>
        <Input
          value={formData.port}
          onChange={(e) => setFormData({ ...formData, port: e.target.value })}
          placeholder="/dev/ttyUSB0"
          required
        />
      </div>

      <div>
        <Label>Baudrate</Label>
        <Input
          type="number"
          value={formData.baudrate}
          onChange={(e) => setFormData({ ...formData, baudrate: parseInt(e.target.value) })}
          required
        />
      </div>

      <div>
        <Label>Slave ID (Modbus)</Label>
        <Input
          type="number"
          value={formData.slave_id}
          onChange={(e) => setFormData({ ...formData, slave_id: parseInt(e.target.value) })}
        />
      </div>

      <div>
        <Label>Capacité Batterie (kWh)</Label>
        <Input
          type="number"
          step="0.1"
          value={formData.battery_capacity}
          onChange={(e) => setFormData({ ...formData, battery_capacity: parseFloat(e.target.value) })}
          placeholder="ex: 10.0"
        />
        <p className="text-xs text-slate-500 mt-1">Nécessaire pour calculer l'autonomie</p>
      </div>

      <Button
        type="submit"
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
        disabled={submitting}
      >
        {submitting ? "Ajout en cours..." : "Ajouter l'onduleur"}
      </Button>
    </form>
  );
};

export default InverterManagement;