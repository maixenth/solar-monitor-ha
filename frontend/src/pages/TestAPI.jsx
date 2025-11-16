import { useState } from "react";
import axios from "axios";
import { API } from "../App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestAPI() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testAPI = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      console.log("Testing API:", API);
      const response = await axios.get(`${API}/`, { timeout: 10000 });
      setResult(JSON.stringify(response.data, null, 2));
    } catch (err) {
      setError(err.message);
      console.error("API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const testStats = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      console.log("Testing stats API:", `${API}/statistics/period?period=week`);
      const response = await axios.get(`${API}/statistics/period?period=week`, { timeout: 30000 });
      setResult(JSON.stringify({
        total_solar: response.data.total_solar_energy,
        battery_discharge: response.data.total_battery_discharge,
        chart_points: response.data.chart_data.length
      }, null, 2));
    } catch (err) {
      setError(err.message);
      console.error("Stats Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Test API Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">API URL: {API}</p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={testAPI} disabled={loading}>
              Test Root API
            </Button>
            <Button onClick={testStats} disabled={loading}>
              Test Stats API (Week)
            </Button>
          </div>

          {loading && (
            <div className="p-4 bg-blue-50 rounded">
              Chargement...
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded">
              <strong>Erreur:</strong> {error}
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 rounded">
              <strong>Résultat:</strong>
              <pre className="mt-2 text-xs overflow-auto">{result}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
