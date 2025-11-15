"""
Contrôleur de gestion énergétique
Applique les règles configurées pour gérer les sources d'énergie
"""
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class EnergyController:
    """
    Contrôleur pour appliquer la logique de gestion énergétique
    
    Note: Cette implémentation est un framework de base.
    Les commandes réelles pour changer la source d'énergie dépendent
    fortement du modèle d'onduleur spécifique.
    """
    
    def __init__(self):
        self.last_decision = None
        self.decision_history = []
    
    def evaluate_and_apply_rules(
        self, 
        config: Dict[str, Any],
        current_readings: Dict[str, Any],
        inverters: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Évalue les règles de gestion énergétique et applique les décisions
        
        Args:
            config: Configuration de gestion énergétique
            current_readings: Lectures actuelles de tous les onduleurs
            inverters: Liste des onduleurs configurés
        
        Returns:
            Décision prise avec actions effectuées
        """
        try:
            mode = config.get('mode', 'manual')
            
            if mode == 'manual':
                # En mode manuel, ne rien faire automatiquement
                logger.debug("Mode manuel: aucune action automatique")
                return None
            
            # Mode automatique: évaluer les règles
            decision = self._evaluate_rules(config, current_readings)
            
            if decision:
                # Appliquer la décision
                success = self._apply_decision(decision, inverters)
                
                if success:
                    self.last_decision = decision
                    self.decision_history.append({
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'decision': decision
                    })
                    
                    # Garder seulement les 100 dernières décisions
                    if len(self.decision_history) > 100:
                        self.decision_history = self.decision_history[-100:]
                
                return decision
            
            return None
            
        except Exception as e:
            logger.error(f"Erreur évaluation règles: {e}")
            return None
    
    def _evaluate_rules(
        self, 
        config: Dict[str, Any],
        readings: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Évalue les règles configurées et détermine l'action à prendre
        
        Règles typiques:
        - Si batterie < seuil_min ET solaire insuffisant → Passer au réseau
        - Si batterie > seuil_max ET solaire > seuil → Exporter vers réseau
        - Si batterie OK ET solaire OK → Utiliser solaire + batterie
        """
        rules = config.get('switching_rules', [])
        priority = config.get('priority', ['solar', 'battery', 'grid'])
        
        # Agréger les données de tous les onduleurs
        total_solar = sum(r.get('dc_power', 0) for r in readings.values())
        avg_battery_soc = sum(r.get('battery_soc', 0) for r in readings.values()) / max(len(readings), 1)
        total_battery_power = sum(r.get('battery_power', 0) for r in readings.values())
        total_grid_power = sum(r.get('grid_power', 0) for r in readings.values())
        total_load = sum(r.get('ac_power', 0) for r in readings.values())
        
        logger.debug(f"Évaluation: Solar={total_solar}W, Battery={avg_battery_soc}%, Load={total_load}W")
        
        # Évaluer chaque règle
        for rule in rules:
            condition_type = rule.get('condition', {}).get('type')
            threshold = rule.get('condition', {}).get('value', 0)
            action = rule.get('action')
            
            triggered = False
            
            if condition_type == 'battery_below':
                triggered = avg_battery_soc < threshold
                reason = f"Batterie {avg_battery_soc}% < {threshold}%"
            
            elif condition_type == 'battery_above':
                triggered = avg_battery_soc > threshold
                reason = f"Batterie {avg_battery_soc}% > {threshold}%"
            
            elif condition_type == 'solar_below':
                triggered = total_solar < threshold
                reason = f"Solaire {total_solar}W < {threshold}W"
            
            elif condition_type == 'solar_above':
                triggered = total_solar > threshold
                reason = f"Solaire {total_solar}W > {threshold}W"
            
            elif condition_type == 'grid_import_above':
                triggered = total_grid_power > threshold
                reason = f"Import réseau {total_grid_power}W > {threshold}W"
            
            elif condition_type == 'load_above':
                triggered = total_load > threshold
                reason = f"Consommation {total_load}W > {threshold}W"
            
            if triggered:
                logger.info(f"✅ Règle déclenchée: {reason} → Action: {action}")
                
                return {
                    'rule': rule,
                    'reason': reason,
                    'action': action,
                    'current_state': {
                        'solar': total_solar,
                        'battery_soc': avg_battery_soc,
                        'battery_power': total_battery_power,
                        'grid_power': total_grid_power,
                        'load': total_load
                    }
                }
        
        # Aucune règle déclenchée
        logger.debug("Aucune règle déclenchée - état stable")
        return None
    
    def _apply_decision(
        self, 
        decision: Dict[str, Any],
        inverters: List[Dict[str, Any]]
    ) -> bool:
        """
        Applique la décision en commandant les onduleurs
        
        ⚠️ IMPORTANT:
        Cette fonction est un FRAMEWORK de base.
        Les commandes réelles dépendent du modèle d'onduleur spécifique.
        
        Pour GROWATT:
        - Certains modèles supportent l'écriture de registres Modbus pour changer de mode
        - Registres typiques: 3000+ (varie selon modèle)
        - Valeurs: 0=Grid First, 1=Battery First, 2=PV First
        
        Pour MPPSOLAR:
        - Commandes: POP (Priority Output Source)
        - Format: POP00 (Utility), POP01 (Solar), POP02 (Battery)
        
        Cette implémentation LOG les actions mais NE LES EXÉCUTE PAS réellement
        pour éviter d'endommager l'équipement sans configuration précise.
        """
        action = decision.get('action', {})
        action_type = action.get('type')
        target = action.get('target')
        
        logger.warning("⚠️ Application de décision (MODE SIMULATION - pas de commande réelle)")
        logger.warning(f"   Action: {action_type} → Cible: {target}")
        logger.warning(f"   Raison: {decision.get('reason')}")
        
        # TODO: Implémenter les commandes réelles selon le modèle d'onduleur
        # 
        # Exemple pour GROWATT (à adapter selon votre modèle):
        # if inverter['brand'] == 'GROWATT':
        #     client = ModbusSerialClient(...)
        #     if target == 'solar':
        #         client.write_register(3000, 2, slave=slave_id)  # PV First
        #     elif target == 'battery':
        #         client.write_register(3000, 1, slave=slave_id)  # Battery First
        #     elif target == 'grid':
        #         client.write_register(3000, 0, slave=slave_id)  # Grid First
        #
        # Exemple pour MPPSOLAR (à adapter):
        # if inverter['brand'] == 'MPPSOLAR':
        #     ser = serial.Serial(...)
        #     if target == 'solar':
        #         command = b'POP01'  # Solar First
        #     elif target == 'battery':
        #         command = b'POP02'  # Battery First
        #     elif target == 'grid':
        #         command = b'POP00'  # Utility First
        #     
        #     crc = calculate_crc(command)
        #     ser.write(command + crc + b'\r')
        
        # Pour l'instant, on simule juste le succès
        logger.info(f"✅ Décision appliquée (simulation): {action_type} vers {target}")
        
        return True
    
    def get_last_decision(self) -> Optional[Dict[str, Any]]:
        """Retourne la dernière décision prise"""
        return self.last_decision
    
    def get_decision_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Retourne l'historique des décisions"""
        return self.decision_history[-limit:]


# Instance globale du contrôleur
controller = EnergyController()


def evaluate_and_apply_energy_rules(
    config: Dict[str, Any],
    current_readings: Dict[str, Any],
    inverters: List[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """Fonction principale pour évaluer et appliquer les règles énergétiques"""
    return controller.evaluate_and_apply_rules(config, current_readings, inverters)


def get_last_energy_decision() -> Optional[Dict[str, Any]]:
    """Obtenir la dernière décision énergétique"""
    return controller.get_last_decision()


def get_energy_decision_history(limit: int = 20) -> List[Dict[str, Any]]:
    """Obtenir l'historique des décisions"""
    return controller.get_decision_history(limit)
