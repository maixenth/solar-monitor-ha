import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../App";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wifi, Globe, Network, Server, Copy, Check, ExternalLink, MonitorSmartphone, Power, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

const Settings = () => {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const [inverterMode, setInverterMode] = useState(null);
  const [changingMode, setChangingMode] = useState(false);

  useEffect(() => {
    fetchNetworkInfo();
    fetchInverterMode();
  }, []);

  const fetchNetworkInfo = async () => {
    try {
      const res = await axios.get(`${API}/system/network-info`);
      setNetworkInfo(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching network info:", error);
      toast.error("Erreur de chargement");
      setLoading(false);
    }
  };

  const fetchInverterMode = async () => {
    try {
      const res = await axios.get(`${API}/system/inverter-mode`);
      setInverterMode(res.data);
    } catch (error) {
      console.error("Error fetching inverter mode:", error);
    }
  };

  const handleChangeMode = async (newMode) => {
    if (changingMode) return;
    
    setChangingMode(true);
    try {
      await axios.put(`${API}/system/inverter-mode?mode=${newMode}`);
      toast.success(`Mode changé en ${newMode}`);
      fetchInverterMode();
    } catch (error) {
      console.error("Error changing mode:", error);
      toast.error("Erreur lors du changement de mode");
    } finally {
      setChangingMode(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copié!`);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8 page-enter" data-testid="settings-page">
      <div className="mb-8">
        <h1 className="text-4xl lg:text-5xl font-bold mb-2 gradient-text">Paramètres Système</h1>
        <p className="text-base text-slate-600">Configuration réseau et accès distant</p>
      </div>

      {/* Mode de fonctionnement */}
      <Card className={`p-6 border-2 shadow-lg mb-6 ${
        inverterMode?.mode === 'REAL' 
          ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300' 
          : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300'
      }`} data-testid="inverter-mode">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Power className={`w-6 h-6 ${inverterMode?.mode === 'REAL' ? 'text-emerald-600' : 'text-amber-600'}`} />
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Mode de Fonctionnement</h2>
              <p className="text-sm text-slate-600">
                {inverterMode?.mode === 'REAL' 
                  ? 'Lecture RÉELLE des onduleurs connectés' 
                  : 'Mode SIMULATION avec données aléatoires'}
              </p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-full font-bold ${
            inverterMode?.mode === 'REAL' 
              ? 'bg-emerald-600 text-white' 
              : 'bg-amber-500 text-white'
          }`}>
            {inverterMode?.mode || 'SIMULATION'}
          </div>
        </div>
        
        <div className="space-y-3">
          {inverterMode?.mode === 'SIMULATION' && (
            <div className="p-4 bg-amber-100 border border-amber-300 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 mb-1">Mode TEST activé</p>
                  <p className="text-sm text-amber-700">
                    L'application génère des données aléatoires pour les tests. 
                    Pour lire les vrais onduleurs, passez en mode REAL.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {inverterMode?.mode === 'REAL' && (
            <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-lg">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-700 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-800 mb-1">Mode PRODUCTION activé</p>
                  <p className="text-sm text-emerald-700">
                    L'application lit les vraies données des onduleurs connectés via Modbus/Serial.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button
              onClick={() => handleChangeMode('SIMULATION')}
              disabled={changingMode || inverterMode?.mode === 'SIMULATION'}
              className={`flex-1 ${
                inverterMode?.mode === 'SIMULATION'
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600'
              } text-white`}
            >
              Mode SIMULATION
            </Button>
            <Button
              onClick={() => handleChangeMode('REAL')}
              disabled={changingMode || inverterMode?.mode === 'REAL'}
              className={`flex-1 ${
                inverterMode?.mode === 'REAL'
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600'
              } text-white`}
            >
              Mode REAL
            </Button>
          </div>
          
          <p className="text-xs text-slate-500 italic">
            💡 Pour rendre ce changement permanent au redémarrage, 
            modifiez la variable INVERTER_MODE dans /app/backend/.env
          </p>
        </div>
      </Card>

      {/* Informations Système */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 shadow-lg mb-6" data-testid="system-info">
        <div className="flex items-center gap-3 mb-4">
          <Server className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-slate-800">Informations Système</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-lg">
            <p className="text-sm text-slate-600 mb-1">Nom d'hôte</p>
            <p className="text-xl font-bold text-slate-800">{networkInfo?.hostname || 'Unknown'}</p>
          </div>
          <div className="p-4 bg-white rounded-lg">
            <p className="text-sm text-slate-600 mb-1">Plateforme</p>
            <p className="text-xl font-bold text-slate-800">{networkInfo?.platform || 'Unknown'}</p>
          </div>
        </div>
      </Card>

      {/* Réseau Local */}
      <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg mb-6" data-testid="local-network">
        <div className="flex items-center gap-3 mb-4">
          <Network className="w-6 h-6 text-emerald-600" />
          <h2 className="text-2xl font-bold text-slate-800">Réseau Local</h2>
        </div>

        {/* Interfaces réseau */}
        <div className="space-y-4 mb-6">
          {networkInfo?.interfaces?.map((iface, idx) => (
            <div key={idx} className={`p-4 rounded-lg border-2 ${
              iface.type === 'wifi' ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {iface.type === 'wifi' ? (
                    <Wifi className="w-5 h-5 text-purple-600" />
                  ) : (
                    <Network className="w-5 h-5 text-blue-600" />
                  )}
                  <span className="font-semibold text-slate-800">
                    {iface.name} ({iface.type === 'wifi' ? 'WiFi' : 'Ethernet'})
                  </span>
                </div>
                <Button
                  onClick={() => copyToClipboard(iface.ip, 'IP locale')}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  {copied === 'IP locale' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-600">IP: </span>
                  <span className="font-mono font-bold text-slate-800">{iface.ip}</span>
                </div>
                <div>
                  <span className="text-slate-600">Masque: </span>
                  <span className="font-mono text-slate-800">{iface.netmask}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* WiFi SSID */}
        {networkInfo?.wifi_ssid && (
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-slate-800">Réseau WiFi Connecté</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold text-purple-700">{networkInfo.wifi_ssid}</p>
                {networkInfo.wifi_signal && (
                  <p className="text-sm text-slate-600">Signal: {networkInfo.wifi_signal}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Gateway */}
        {networkInfo?.gateway && (
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-1">Passerelle (Gateway)</p>
            <p className="font-mono text-lg font-bold text-slate-800">{networkInfo.gateway}</p>
          </div>
        )}
      </Card>

      {/* Accès Distant */}
      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 shadow-lg mb-6" data-testid="remote-access">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-6 h-6 text-emerald-600" />
          <h2 className="text-2xl font-bold text-slate-800">Accès Distant</h2>
        </div>

        {/* IP Publique */}
        <div className="p-4 bg-white rounded-lg mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-slate-800">Adresse IP Publique</span>
            </div>
            <Button
              onClick={() => copyToClipboard(networkInfo?.public_ip, 'IP publique')}
              variant="outline"
              size="sm"
            >
              {copied === 'IP publique' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="font-mono text-2xl font-bold text-emerald-600">
            {networkInfo?.public_ip || 'Non disponible'}
          </p>
        </div>

        {/* URLs d'accès */}
        <div className="space-y-3 mb-4">
          <h3 className="font-semibold text-slate-700 mb-2">URLs d'accès à l'application:</h3>
          
          {/* Accès local */}
          {networkInfo?.local_ips?.map((ip, idx) => (
            <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Accès local (même réseau)</p>
                  <p className="font-mono text-sm font-bold text-blue-600">
                    http://{ip}:3000
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard(`http://${ip}:3000`, 'URL locale')}
                    variant="outline"
                    size="sm"
                  >
                    {copied === 'URL locale' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    onClick={() => window.open(`http://${ip}:3000`, '_blank')}
                    variant="outline"
                    size="sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Instructions accès distant */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <MonitorSmartphone className="w-5 h-5" />
            Configuration Accès Distant Internet
          </h3>
          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-semibold">Pour accéder depuis Internet, 3 options:</p>
            
            <div className="ml-4 space-y-2">
              <div>
                <p className="font-semibold text-blue-700">1. Port Forwarding (NAT) - Recommandé</p>
                <ul className="list-disc ml-4 text-xs space-y-1 text-slate-600">
                  <li>Accéder à votre box/routeur (ex: 192.168.1.1)</li>
                  <li>Configurer redirection port 3000 → {networkInfo?.local_ips?.[0] || 'IP_RASPBERRY'}:3000</li>
                  <li>Accès: http://{networkInfo?.public_ip || 'VOTRE_IP_PUBLIQUE'}:3000</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-purple-700">2. VPN (Sécurisé)</p>
                <ul className="list-disc ml-4 text-xs space-y-1 text-slate-600">
                  <li>Installer WireGuard ou OpenVPN sur le Raspberry Pi</li>
                  <li>Connexion VPN depuis n'importe où</li>
                  <li>Accès sécurisé au réseau local</li>
                </ul>
              </div>

              <div>
                <p className="font-semibold text-green-700">3. Tunnel (ngrok, cloudflared)</p>
                <ul className="list-disc ml-4 text-xs space-y-1 text-slate-600">
                  <li>Installer: sudo npm install -g localtunnel</li>
                  <li>Exécuter: lt --port 3000 --subdomain solar-monitor</li>
                  <li>URL publique générée automatiquement</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Sécurité */}
      <Card className="p-6 bg-gradient-to-br from-red-50 to-orange-50 border-red-200 shadow-lg" data-testid="security">
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-2xl font-bold text-slate-800">Sécurité</h2>
        </div>

        <div className="space-y-3 text-sm">
          <div className="p-3 bg-white rounded-lg">
            <p className="font-semibold text-red-700 mb-1">⚠️ Important pour l'accès distant:</p>
            <ul className="list-disc ml-4 space-y-1 text-slate-600">
              <li>Utilisez un mot de passe fort pour le Raspberry Pi</li>
              <li>Activez le pare-feu (ufw) et n'ouvrez que les ports nécessaires</li>
              <li>Considérez l'ajout d'une authentification à l'application</li>
              <li>Utilisez HTTPS avec Let's Encrypt pour chiffrer les communications</li>
              <li>Mettez à jour régulièrement le système (sudo apt update && sudo apt upgrade)</li>
            </ul>
          </div>

          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="font-semibold text-green-700 mb-1">✅ Bonnes pratiques:</p>
            <ul className="list-disc ml-4 space-y-1 text-slate-600">
              <li>Changez le port par défaut (3000 → 8443 par exemple)</li>
              <li>Utilisez Fail2Ban pour bloquer les tentatives d'accès répétées</li>
              <li>Activez les logs de connexion</li>
              <li>Faites des sauvegardes régulières de la base de données</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Guide Installation */}
      <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg" data-testid="install-guide">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Guide d'Installation Raspberry Pi</h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold text-slate-700 mb-2">1. Configuration réseau</h3>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto">
              <code>{`# Configuration WiFi
sudo raspi-config
# Choisir: System Options → Wireless LAN

# Ou configuration manuelle
sudo nano /etc/wpa_supplicant/wpa_supplicant.conf
# Ajouter:
network={
  ssid="VOTRE_SSID"
  psk="VOTRE_MOT_DE_PASSE"
}`}</code>
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-2">2. IP statique (recommandé)</h3>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto">
              <code>{`sudo nano /etc/dhcpcd.conf
# Ajouter à la fin:
interface wlan0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 8.8.4.4`}</code>
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-2">3. Activer SSH (accès distant terminal)</h3>
            <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto">
              <code>{`sudo raspi-config
# Interface Options → SSH → Enable

# Puis se connecter depuis un autre PC:
ssh pi@${networkInfo?.local_ips?.[0] || '192.168.1.100'}`}</code>
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;