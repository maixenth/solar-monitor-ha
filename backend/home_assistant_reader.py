"""
Home Assistant Reader Module
Connects to Home Assistant API to read solar data from Solar Assistant or other integrations
"""

import requests
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class HomeAssistantReader:
    """Reader for Home Assistant API"""
    
    def __init__(self, url: str, token: str):
        """
        Initialize Home Assistant connection
        
        Args:
            url: Home Assistant URL (e.g., http://homeassistant.local:8123)
            token: Long-Lived Access Token
        """
        self.url = url.rstrip('/')
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_connection(self) -> Dict[str, Any]:
        """
        Test connection to Home Assistant
        
        Returns:
            Dict with success status and message
        """
        try:
            response = requests.get(
                f"{self.url}/api/",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "message": f"Connected to Home Assistant v{data.get('version', 'unknown')}",
                    "version": data.get('version')
                }
            else:
                return {
                    "success": False,
                    "message": f"Connection failed: HTTP {response.status_code}"
                }
                
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "message": "Connection timeout - check URL and network"
            }
        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "message": "Connection error - check if Home Assistant is running"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }
    
    def get_all_entities(self) -> List[Dict[str, Any]]:
        """
        Get all entities from Home Assistant
        
        Returns:
            List of all entities with their states
        """
        try:
            response = requests.get(
                f"{self.url}/api/states",
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get entities: HTTP {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting entities: {e}")
            return []
    
    def detect_solar_assistant_entities(self) -> Dict[str, List[str]]:
        """
        Automatically detect Solar Assistant entities
        
        Returns:
            Dictionary categorizing Solar Assistant entities
        """
        all_entities = self.get_all_entities()
        
        solar_entities = {
            "solar_production": [],
            "battery": [],
            "grid": [],
            "load": [],
            "energy": [],
            "other": []
        }
        
        # Common patterns for Solar Assistant entities
        patterns = {
            "solar_production": ["solar", "pv", "production", "inverter_power"],
            "battery": ["battery"],
            "grid": ["grid"],
            "load": ["load", "consumption", "house"],
            "energy": ["energy_today", "energy_total", "kwh"]
        }
        
        for entity in all_entities:
            entity_id = entity.get("entity_id", "")
            
            # Check if it's a solar-related entity
            if any(keyword in entity_id.lower() for keyword in ["solar", "pv", "battery", "grid", "inverter", "energy"]):
                categorized = False
                
                for category, keywords in patterns.items():
                    if any(keyword in entity_id.lower() for keyword in keywords):
                        solar_entities[category].append({
                            "entity_id": entity_id,
                            "friendly_name": entity.get("attributes", {}).get("friendly_name", entity_id),
                            "state": entity.get("state"),
                            "unit": entity.get("attributes", {}).get("unit_of_measurement", "")
                        })
                        categorized = True
                        break
                
                if not categorized:
                    solar_entities["other"].append({
                        "entity_id": entity_id,
                        "friendly_name": entity.get("attributes", {}).get("friendly_name", entity_id),
                        "state": entity.get("state"),
                        "unit": entity.get("attributes", {}).get("unit_of_measurement", "")
                    })
        
        return solar_entities
    
    def get_entity_state(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """
        Get state of a specific entity
        
        Args:
            entity_id: Entity ID (e.g., sensor.solar_assistant_battery_soc)
            
        Returns:
            Entity state data or None
        """
        try:
            response = requests.get(
                f"{self.url}/api/states/{entity_id}",
                headers=self.headers,
                timeout=5
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
                
        except Exception as e:
            logger.error(f"Error getting entity {entity_id}: {e}")
            return None
    
    def read_solar_data(self, entity_mapping: Dict[str, str]) -> Dict[str, Any]:
        """
        Read solar data from configured entities
        Supports multiple inverters by summing values with _inv1 and _inv2 suffixes
        
        Args:
            entity_mapping: Dictionary mapping data types to entity IDs
                Example:
                {
                    "solar_power": "sensor.solar_assistant_pv_power",
                    "solar_power_inv2": "sensor.inverter_2_pv_power",  # Optional second inverter
                    "battery_soc": "sensor.solar_assistant_battery_soc",
                    ...
                }
        
        Returns:
            Dictionary with solar data (aggregated for multiple inverters)
        """
        data = {}
        
        # First pass: collect all values
        raw_data = {}
        for data_type, entity_id in entity_mapping.items():
            if entity_id:
                entity_state = self.get_entity_state(entity_id)
                if entity_state:
                    try:
                        state_value = entity_state.get("state")
                        
                        # Convert to float, handle 'unknown' or 'unavailable'
                        if state_value in ["unknown", "unavailable", None]:
                            raw_data[data_type] = 0.0
                        else:
                            raw_data[data_type] = float(state_value)
                    except (ValueError, TypeError):
                        raw_data[data_type] = 0.0
                else:
                    raw_data[data_type] = 0.0
        
        # Second pass: aggregate multiple inverters
        # For metrics with _inv2 suffix, add them to the base metric
        aggregated_keys = set()
        
        for key, value in raw_data.items():
            if key.endswith('_inv2'):
                # This is inverter 2, add to base metric
                base_key = key[:-5]  # Remove '_inv2'
                if base_key in raw_data:
                    data[base_key] = raw_data[base_key] + value
                    aggregated_keys.add(base_key)
                    aggregated_keys.add(key)
                else:
                    # No inv1, use inv2 value as base
                    data[base_key] = value
                    aggregated_keys.add(key)
            elif key not in aggregated_keys:
                # Regular metric or already aggregated
                data[key] = value
        
        return data
    
    def map_to_inverter_reading(self, solar_data: Dict[str, Any], battery_capacity_kwh: float = 27.2) -> Dict[str, Any]:
        """
        Map Home Assistant data to InverterReading format
        
        Args:
            solar_data: Data from Home Assistant
            battery_capacity_kwh: Battery capacity in kWh
            
        Returns:
            Dictionary compatible with InverterReading model
        """
        # Get values with defaults
        solar_power = solar_data.get("solar_power", 0.0)
        battery_soc = solar_data.get("battery_soc", 0.0)
        battery_power = solar_data.get("battery_power", 0.0)
        grid_power = solar_data.get("grid_power", 0.0)
        load_power = solar_data.get("load_power", 0.0)
        energy_today = solar_data.get("energy_today", 0.0)
        energy_total = solar_data.get("energy_total", 0.0)
        
        # Calculate battery voltage (estimate from SOC)
        battery_voltage = 48.0 + (battery_soc / 100.0) * 6.0  # 48V to 54V range
        
        # Calculate battery current from power
        battery_current = battery_power / battery_voltage if battery_voltage > 0 else 0.0
        
        # Map to InverterReading format
        reading = {
            "ac_power": solar_power,
            "dc_power": solar_power * 1.05,  # Estimate DC from AC with 5% loss
            "ac_voltage": 230.0,  # Standard grid voltage
            "dc_voltage": 400.0,  # Standard DC bus voltage
            "ac_current": solar_power / 230.0 if solar_power > 0 else 0.0,
            "dc_current": (solar_power * 1.05) / 400.0 if solar_power > 0 else 0.0,
            "frequency": 50.0,  # Standard frequency for Benin
            "energy_today": energy_today,
            "energy_total": energy_total,
            "battery_voltage": battery_voltage,
            "battery_current": battery_current,
            "battery_soc": battery_soc,
            "battery_temperature": 25.0,  # Default if not available
            "battery_power": battery_power,
            "grid_power": grid_power,
            "grid_voltage": 230.0,
            "grid_frequency": 50.0,
            "load_power": load_power,  # Actual load power from Home Assistant
            "temperature": 45.0,  # Default inverter temp if not available
            "status": "ok"
        }
        
        return reading


# Global instance (will be initialized when configured)
ha_reader: Optional[HomeAssistantReader] = None


def initialize_ha_reader(url: str, token: str) -> bool:
    """
    Initialize the global Home Assistant reader
    
    Args:
        url: Home Assistant URL
        token: Access token
        
    Returns:
        True if successful, False otherwise
    """
    global ha_reader
    
    try:
        ha_reader = HomeAssistantReader(url, token)
        result = ha_reader.test_connection()
        
        if result["success"]:
            logger.info(f"✅ Home Assistant connected: {result['message']}")
            return True
        else:
            logger.error(f"❌ Home Assistant connection failed: {result['message']}")
            ha_reader = None
            return False
            
    except Exception as e:
        logger.error(f"Error initializing Home Assistant reader: {e}")
        ha_reader = None
        return False


def get_ha_reader() -> Optional[HomeAssistantReader]:
    """Get the global Home Assistant reader instance"""
    return ha_reader
