import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, Home, Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function HomeAssistantConfig() {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [config, setConfig] = useState(null);
  const [solarEntities, setSolarEntities] = useState(null);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [entityMapping, setEntityMapping] = useState({
    solar_power: "",
    battery_soc: "",
    battery_power: "",
    grid_power: "",
    load_power: "",
    energy_today: "",
    energy_total: ""
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await axios.get(`${API}/home-assistant/config`);
      if (response.data.configured) {
        setConfig(response.data);
        setUrl(response.data.url);
        if (response.data.entity_mapping) {
          setEntityMapping(response.data.entity_mapping);
        }
      }
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

  const testConnection = async () => {
    if (!url || !token) {
      setTestResult({ success: false, message: "Veuillez remplir l'URL et le token" });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await axios.post(`${API}/home-assistant/test`, { url, token });
      setTestResult(response.data);
    } catch (error) {
      setTestResult({
        success: false,
        message: error.response?.data?.detail || "Erreur de connexion"
      });
    } finally {
      setTesting(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/home-assistant/config`, { url, token });
      setTestResult({ success: true, message: "Configuration sauvegardée avec succès !" });
      loadConfig();
      
      // Auto-detect entities after saving
      detectSolarEntities();
    } catch (error) {
      setTestResult({
        success: false,
        message: error.response?.data?.detail || "Erreur lors de la sauvegarde"
      });
    } finally {
      setSaving(false);
    }
  };

  const detectSolarEntities = async () => {
    setLoadingEntities(true);
    try {
      const response = await axios.get(`${API}/home-assistant/detect-solar`);
      setSolarEntities(response.data);
      
      // Auto-fill entity mapping with first detected entity of each type
      const autoMapping = { ...entityMapping };
      if (response.data.solar_production && response.data.solar_production.length > 0) {
        autoMapping.solar_power = response.data.solar_production[0].entity_id;
      }
      if (response.data.battery && response.data.battery.length > 0) {
        const socEntity = response.data.battery.find(e => e.entity_id.includes("soc"));
        const powerEntity = response.data.battery.find(e => e.entity_id.includes("power"));
        if (socEntity) autoMapping.battery_soc = socEntity.entity_id;
        if (powerEntity) autoMapping.battery_power = powerEntity.entity_id;
      }
      if (response.data.grid && response.data.grid.length > 0) {
        autoMapping.grid_power = response.data.grid[0].entity_id;
      }
      if (response.data.load && response.data.load.length > 0) {
        autoMapping.load_power = response.data.load[0].entity_id;
      }
      if (response.data.energy && response.data.energy.length > 0) {
        const todayEntity = response.data.energy.find(e => e.entity_id.includes("today"));
        const totalEntity = response.data.energy.find(e => e.entity_id.includes("total"));
        if (todayEntity) autoMapping.energy_today = todayEntity.entity_id;
        if (totalEntity) autoMapping.energy_total = totalEntity.entity_id;
      }
      
      setEntityMapping(autoMapping);
    } catch (error) {
      console.error("Error detecting entities:", error);
    } finally {
      setLoadingEntities(false);
    }
  };

  const saveEntityMapping = async () => {
    try {
      await axios.put(`${API}/home-assistant/entity-mapping`, entityMapping);
      setTestResult({ success: true, message: "Mapping des entités sauvegardé !" });
    } catch (error) {
      setTestResult({
        success: false,
        message: "Erreur lors de la sauvegarde du mapping"
      });
    }
  };

  const EntityMappingField = ({ label, field, entities }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={entityMapping[field]}
        onValueChange={(value) => setEntityMapping({ ...entityMapping, [field]: value })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Sélectionner une entité" />
        </SelectTrigger>
        <SelectContent>
          {entities && entities.map((entity) => (
            <SelectItem key={entity.entity_id} value={entity.entity_id}>
              {entity.friendly_name} ({entity.state} {entity.unit})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="p-8" data-testid="home-assistant-config">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Home className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Configuration Home Assistant</h1>
            <p className="text-gray-600">Connectez votre instance Home Assistant pour récupérer les données solaires</p>
          </div>
        </div>

        {/* Connection Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Connexion Home Assistant</CardTitle>
            <CardDescription>
              Configurez l'URL et le token d'accès à long terme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL Home Assistant</Label>
              <Input
                id="url"
                data-testid="ha-url-input"
                placeholder="http://homeassistant.local:8123"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-sm text-gray-500">
                Exemple: http://192.168.1.100:8123 ou https://votre-url.duckdns.org
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Token d'Accès à Long Terme</Label>
              <Input
                id="token"
                data-testid="ha-token-input"
                type="password"
                placeholder="eyJ0eXAiOiJKV1QiLCJhbGc..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <p className="text-sm text-gray-500">
                Profil → Sécurité → Créer un token d'accès à long terme
              </p>
            </div>

            {testResult && (
              <Alert variant={testResult.success ? "default" : "destructive"}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{testResult.message}</AlertDescription>
                </div>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={testConnection}
                disabled={testing || !url || !token}
                data-testid="test-connection-btn"
              >
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tester la Connexion
              </Button>
              
              <Button
                onClick={saveConfig}
                disabled={saving || !testResult?.success}
                variant="default"
                data-testid="save-config-btn"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sauvegarder
              </Button>

              {config && (
                <Button
                  onClick={detectSolarEntities}
                  disabled={loadingEntities}
                  variant="outline"
                  data-testid="detect-entities-btn"
                >
                  {loadingEntities && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Zap className="mr-2 h-4 w-4" />
                  Détecter Entités Solar Assistant
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Entity Mapping */}
        {solarEntities && (
          <Card>
            <CardHeader>
              <CardTitle>Mapping des Entités</CardTitle>
              <CardDescription>
                Associez les entités Home Assistant aux données solaires
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EntityMappingField
                  label="Production Solaire (W)"
                  field="solar_power"
                  entities={solarEntities.solar_production}
                />
                
                <EntityMappingField
                  label="État de Charge Batterie (%)"
                  field="battery_soc"
                  entities={solarEntities.battery}
                />
                
                <EntityMappingField
                  label="Puissance Batterie (W)"
                  field="battery_power"
                  entities={solarEntities.battery}
                />
                
                <EntityMappingField
                  label="Puissance Réseau (W)"
                  field="grid_power"
                  entities={solarEntities.grid}
                />
                
                <EntityMappingField
                  label="Consommation Maison (W)"
                  field="load_power"
                  entities={solarEntities.load}
                />
                
                <EntityMappingField
                  label="Énergie Aujourd'hui (kWh)"
                  field="energy_today"
                  entities={solarEntities.energy}
                />
                
                <EntityMappingField
                  label="Énergie Totale (kWh)"
                  field="energy_total"
                  entities={solarEntities.energy}
                />
              </div>

              <Button
                onClick={saveEntityMapping}
                data-testid="save-mapping-btn"
              >
                Sauvegarder le Mapping
              </Button>

              {/* Summary */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold mb-2">Entités Détectées :</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Production Solaire: {solarEntities.solar_production?.length || 0}</div>
                  <div>Batterie: {solarEntities.battery?.length || 0}</div>
                  <div>Réseau: {solarEntities.grid?.length || 0}</div>
                  <div>Consommation: {solarEntities.load?.length || 0}</div>
                  <div>Énergie: {solarEntities.energy?.length || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Status */}
        {config && (
          <Card>
            <CardHeader>
              <CardTitle>État Actuel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">URL:</span>
                  <span className="font-mono">{config.url}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={config.last_test_success ? "text-green-600" : "text-red-600"}>
                    {config.last_test_success ? "✅ Connecté" : "❌ Déconnecté"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dernier test:</span>
                  <span>{config.last_test ? new Date(config.last_test).toLocaleString() : "N/A"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
