import { useEffect, useState } from 'react';
import { Sun, Home, Battery, Zap, ArrowRight, ArrowDown, ArrowUp } from 'lucide-react';

const EnergyFlowDiagram = ({ solarPower, batteryPower, gridPower, loadPower }) => {
  const [activeFlows, setActiveFlows] = useState({
    solarToHome: false,
    solarToBattery: false,
    solarToGrid: false,
    batteryToHome: false,
    gridToHome: false,
    gridToBattery: false
  });

  useEffect(() => {
    const flows = {
      solarToHome: solarPower > 100,
      solarToBattery: solarPower > 100 && batteryPower > 50,
      solarToGrid: solarPower > 100 && gridPower < -50,
      batteryToHome: batteryPower < -50,
      gridToHome: gridPower > 50,
      gridToBattery: gridPower > 50 && batteryPower > 50
    };
    setActiveFlows(flows);
  }, [solarPower, batteryPower, gridPower]);

  const FlowArrow = ({ active, direction, position, color = 'emerald' }) => {
    const Icon = direction === 'down' ? ArrowDown : direction === 'up' ? ArrowUp : ArrowRight;
    const bgColor = active ? `bg-${color}-100` : 'bg-slate-100';
    const iconColor = active ? `text-${color}-600` : 'text-slate-400';
    
    return (
      <div className={`absolute ${position} z-10`}>
        <div className={`${bgColor} rounded-full p-2 shadow-lg border-2 ${
          active ? `border-${color}-400 animate-pulse` : 'border-slate-300'
        }`}>
          <Icon className={`w-6 h-6 ${iconColor} ${active ? 'animate-bounce' : ''}`} />
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-[500px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8" data-testid="energy-flow-diagram">
      {/* Solaire - En haut */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2" data-testid="solar-node">
        <div className={`p-6 rounded-2xl shadow-xl backdrop-blur-sm border-2 transition-all ${
          solarPower > 100 ? 'bg-yellow-100 border-yellow-400 shadow-yellow-200' : 'bg-white border-slate-300'
        }`}>
          <Sun className={`w-12 h-12 mx-auto mb-2 ${solarPower > 100 ? 'text-yellow-600' : 'text-slate-400'}`} />
          <p className="text-xs font-medium text-slate-600 text-center">Solaire</p>
          <p className="text-lg font-bold text-slate-800 text-center">{solarPower.toFixed(0)}W</p>
        </div>
      </div>

      {/* Maison - Centre */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" data-testid="home-node">
        <div className="p-8 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl shadow-2xl border-2 border-blue-400">
          <Home className="w-16 h-16 mx-auto mb-2 text-blue-600" />
          <p className="text-sm font-medium text-slate-600 text-center">Maison</p>
          <p className="text-2xl font-bold text-blue-800 text-center">{loadPower.toFixed(0)}W</p>
        </div>
      </div>

      {/* Batterie - Gauche */}
      <div className="absolute top-1/2 left-8 -translate-y-1/2" data-testid="battery-node">
        <div className={`p-6 rounded-2xl shadow-xl backdrop-blur-sm border-2 transition-all ${
          Math.abs(batteryPower) > 50 
            ? batteryPower > 0 
              ? 'bg-green-100 border-green-400 shadow-green-200' 
              : 'bg-orange-100 border-orange-400 shadow-orange-200'
            : 'bg-white border-slate-300'
        }`}>
          <Battery className={`w-12 h-12 mx-auto mb-2 ${
            batteryPower > 50 ? 'text-green-600' : batteryPower < -50 ? 'text-orange-600' : 'text-slate-400'
          }`} />
          <p className="text-xs font-medium text-slate-600 text-center">Batterie</p>
          <p className="text-lg font-bold text-slate-800 text-center">{Math.abs(batteryPower).toFixed(0)}W</p>
          <p className="text-xs text-slate-500 text-center">{batteryPower > 0 ? 'Charge' : 'Décharge'}</p>
        </div>
      </div>

      {/* Réseau - Droite */}
      <div className="absolute top-1/2 right-8 -translate-y-1/2" data-testid="grid-node">
        <div className={`p-6 rounded-2xl shadow-xl backdrop-blur-sm border-2 transition-all ${
          Math.abs(gridPower) > 50
            ? gridPower > 0
              ? 'bg-red-100 border-red-400 shadow-red-200'
              : 'bg-purple-100 border-purple-400 shadow-purple-200'
            : 'bg-white border-slate-300'
        }`}>
          <Zap className={`w-12 h-12 mx-auto mb-2 ${
            gridPower > 50 ? 'text-red-600' : gridPower < -50 ? 'text-purple-600' : 'text-slate-400'
          }`} />
          <p className="text-xs font-medium text-slate-600 text-center">Réseau</p>
          <p className="text-lg font-bold text-slate-800 text-center">{Math.abs(gridPower).toFixed(0)}W</p>
          <p className="text-xs text-slate-500 text-center">{gridPower > 0 ? 'Import' : 'Export'}</p>
        </div>
      </div>

      {/* Flèches directionnelles */}
      {/* Solaire → Maison */}
      {activeFlows.solarToHome && (
        <FlowArrow active={true} direction="down" position="top-[140px] left-1/2 -translate-x-1/2" color="emerald" />
      )}

      {/* Solaire → Batterie */}
      {activeFlows.solarToBattery && (
        <FlowArrow active={true} direction="down" position="top-[160px] left-[30%]" color="green" />
      )}

      {/* Solaire → Réseau (export) */}
      {activeFlows.solarToGrid && (
        <FlowArrow active={true} direction="down" position="top-[160px] right-[30%]" color="purple" />
      )}

      {/* Batterie → Maison */}
      {activeFlows.batteryToHome && (
        <FlowArrow active={true} direction="right" position="top-1/2 left-[180px] -translate-y-1/2" color="orange" />
      )}

      {/* Réseau → Maison */}
      {activeFlows.gridToHome && (
        <FlowArrow active={true} direction="left" position="top-1/2 right-[180px] -translate-y-1/2" color="red" />
      )}

      {/* Réseau → Batterie */}
      {activeFlows.gridToBattery && (
        <FlowArrow active={true} direction="left" position="top-[60%] left-[25%]" color="red" />
      )}

      {/* Lignes de connexion avec animation */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        <defs>
          <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#f97316" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Solaire → Maison */}
        {activeFlows.solarToHome && (
          <line x1="50%" y1="22%" x2="50%" y2="42%" stroke="url(#emeraldGradient)" strokeWidth="6" strokeDasharray="10 5" className="animate-dash" />
        )}

        {/* Solaire → Batterie */}
        {activeFlows.solarToBattery && (
          <line x1="45%" y1="25%" x2="22%" y2="45%" stroke="#22c55e" strokeWidth="4" strokeDasharray="8 4" className="animate-dash" />
        )}

        {/* Solaire → Réseau */}
        {activeFlows.solarToGrid && (
          <line x1="55%" y1="25%" x2="78%" y2="45%" stroke="#a855f7" strokeWidth="4" strokeDasharray="8 4" className="animate-dash" />
        )}

        {/* Batterie → Maison */}
        {activeFlows.batteryToHome && (
          <line x1="25%" y1="50%" x2="42%" y2="50%" stroke="url(#orangeGradient)" strokeWidth="6" strokeDasharray="10 5" className="animate-dash" />
        )}

        {/* Réseau → Maison */}
        {activeFlows.gridToHome && (
          <line x1="75%" y1="50%" x2="58%" y2="50%" stroke="url(#redGradient)" strokeWidth="6" strokeDasharray="10 5" className="animate-dash" />
        )}
      </svg>

      <style jsx>{`
        @keyframes dash {
          to { stroke-dashoffset: -100; }
        }
        .animate-dash {
          animation: dash 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default EnergyFlowDiagram;