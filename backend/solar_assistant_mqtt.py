"""
Solar Assistant MQTT Reader
Connexion directe à Solar Assistant via MQTT (sans Home Assistant)
"""

import paho.mqtt.client as mqtt
import json
import logging
from typing import Dict, Any, Optional, Callable
import time
from threading import Lock

logger = logging.getLogger(__name__)


class SolarAssistantMQTT:
    """Client MQTT pour Solar Assistant"""
    
    def __init__(self, broker_host: str, broker_port: int = 1883, username: str = None, password: str = None):
        """
        Initialize Solar Assistant MQTT client
        
        Args:
            broker_host: IP address of Solar Assistant (e.g., 192.168.1.162)
            broker_port: MQTT port (default: 1883)
            username: MQTT username (optional)
            password: MQTT password (optional)
        """
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.username = username
        self.password = password
        
        self.client = mqtt.Client(client_id="solar_monitor_app")
        self.connected = False
        self.data_lock = Lock()
        self.latest_data: Dict[str, Any] = {}
        
        # Setup callbacks
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect
        
        if username and password:
            self.client.username_pw_set(username, password)
    
    def _on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker"""
        if rc == 0:
            self.connected = True
            logger.info(f"✅ Connected to Solar Assistant MQTT broker at {self.broker_host}")
            
            # Subscribe to all Solar Assistant topics
            # Pattern: solar_assistant/#
            self.client.subscribe("solar_assistant/#")
            logger.info("📡 Subscribed to solar_assistant/# topics")
        else:
            self.connected = False
            error_messages = {
                1: "Connection refused - incorrect protocol version",
                2: "Connection refused - invalid client identifier",
                3: "Connection refused - server unavailable",
                4: "Connection refused - bad username or password",
                5: "Connection refused - not authorized"
            }
            logger.error(f"❌ Failed to connect: {error_messages.get(rc, f'Unknown error {rc}')}")
    
    def _on_message(self, client, userdata, msg):
        """Callback when message received"""
        try:
            topic = msg.topic
            payload = msg.payload.decode('utf-8')
            
            # Parse topic
            # Example: solar_assistant/inverter_1/pv_power
            parts = topic.split('/')
            
            if len(parts) >= 3 and parts[0] == 'solar_assistant':
                inverter_id = parts[1]  # e.g., inverter_1
                metric = parts[2]        # e.g., pv_power
                
                # Try to convert to float
                try:
                    value = float(payload)
                except ValueError:
                    value = payload
                
                # Store data
                with self.data_lock:
                    if inverter_id not in self.latest_data:
                        self.latest_data[inverter_id] = {}
                    
                    self.latest_data[inverter_id][metric] = value
                    self.latest_data[inverter_id]['last_update'] = time.time()
                
                logger.debug(f"📊 {topic} = {value}")
        
        except Exception as e:
            logger.error(f"Error processing message from {msg.topic}: {e}")
    
    def _on_disconnect(self, client, userdata, rc):
        """Callback when disconnected"""
        self.connected = False
        if rc != 0:
            logger.warning(f"⚠️ Unexpected disconnection from MQTT broker (rc={rc})")
        else:
            logger.info("Disconnected from MQTT broker")
    
    def connect(self) -> bool:
        """
        Connect to Solar Assistant MQTT broker
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            logger.info(f"🔌 Connecting to Solar Assistant at {self.broker_host}:{self.broker_port}...")
            self.client.connect(self.broker_host, self.broker_port, keepalive=60)
            self.client.loop_start()
            
            # Wait for connection (max 5 seconds)
            for _ in range(50):
                if self.connected:
                    return True
                time.sleep(0.1)
            
            logger.error("Connection timeout")
            return False
            
        except Exception as e:
            logger.error(f"❌ Error connecting to Solar Assistant: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from MQTT broker"""
        self.client.loop_stop()
        self.client.disconnect()
        self.connected = False
        logger.info("Disconnected from Solar Assistant")
    
    def is_connected(self) -> bool:
        """Check if connected to MQTT broker"""
        return self.connected
    
    def get_latest_data(self, inverter_id: str = "inverter_1") -> Dict[str, Any]:
        """
        Get latest data for a specific inverter
        
        Args:
            inverter_id: Inverter ID (e.g., inverter_1, inverter_2)
            
        Returns:
            Dictionary with latest metrics
        """
        with self.data_lock:
            return self.latest_data.get(inverter_id, {}).copy()
    
    def get_all_data(self) -> Dict[str, Dict[str, Any]]:
        """Get data for all inverters"""
        with self.data_lock:
            return self.latest_data.copy()
    
    def get_aggregated_data(self) -> Dict[str, Any]:
        """
        Get aggregated data from all inverters
        
        Returns:
            Dictionary with total/average values
        """
        with self.data_lock:
            all_data = self.latest_data.copy()
        
        if not all_data:
            return {}
        
        # Aggregate common metrics
        aggregated = {
            'pv_power': 0.0,
            'battery_power': 0.0,
            'battery_voltage': 0.0,
            'battery_current': 0.0,
            'battery_state_of_charge': 0.0,
            'grid_power': 0.0,
            'grid_voltage': 0.0,
            'grid_frequency': 0.0,
            'load_power': 0.0,
            'load_apparent_power': 0.0,
            'temperature': 0.0,
            'total_energy': 0.0,
            'inverter_count': 0
        }
        
        for inverter_id, data in all_data.items():
            if not data:
                continue
                
            aggregated['inverter_count'] += 1
            
            # Sum power values
            aggregated['pv_power'] += data.get('pv_power', 0.0)
            aggregated['battery_power'] += data.get('battery_power', 0.0)
            aggregated['grid_power'] += data.get('grid_power', 0.0)
            aggregated['load_power'] += data.get('load_power', 0.0)
            aggregated['load_apparent_power'] += data.get('load_apparent_power', 0.0)
            aggregated['total_energy'] += data.get('total_energy', 0.0)
            
            # Average for voltage/frequency/temperature
            aggregated['battery_voltage'] += data.get('battery_voltage', 0.0)
            aggregated['battery_current'] += data.get('battery_current', 0.0)
            aggregated['battery_state_of_charge'] += data.get('battery_state_of_charge', 0.0)
            aggregated['grid_voltage'] += data.get('grid_voltage', 0.0)
            aggregated['grid_frequency'] += data.get('grid_frequency', 0.0)
            aggregated['temperature'] += data.get('temperature', 0.0)
        
        # Calculate averages
        if aggregated['inverter_count'] > 0:
            count = aggregated['inverter_count']
            aggregated['battery_voltage'] /= count
            aggregated['battery_current'] /= count
            aggregated['battery_state_of_charge'] /= count
            aggregated['grid_voltage'] /= count
            aggregated['grid_frequency'] /= count
            aggregated['temperature'] /= count
        
        return aggregated
    
    def map_to_inverter_reading(self, battery_capacity_kwh: float = 27.2) -> Dict[str, Any]:
        """
        Map Solar Assistant data to InverterReading format
        
        Args:
            battery_capacity_kwh: Battery capacity in kWh
            
        Returns:
            Dictionary compatible with InverterReading model
        """
        data = self.get_aggregated_data()
        
        if not data:
            return None
        
        # Map to our format
        reading = {
            "ac_power": data.get('pv_power', 0.0),
            "dc_power": data.get('pv_power', 0.0) * 1.05,  # Estimate
            "ac_voltage": 230.0,  # Standard
            "dc_voltage": 400.0,  # Standard
            "ac_current": data.get('pv_power', 0.0) / 230.0 if data.get('pv_power', 0.0) > 0 else 0.0,
            "dc_current": (data.get('pv_power', 0.0) * 1.05) / 400.0 if data.get('pv_power', 0.0) > 0 else 0.0,
            "frequency": data.get('grid_frequency', 50.0),
            "energy_today": data.get('total_energy', 0.0),
            "energy_total": data.get('total_energy', 0.0),
            "battery_voltage": data.get('battery_voltage', 48.0),
            "battery_current": data.get('battery_current', 0.0),
            "battery_soc": data.get('battery_state_of_charge', 0.0),
            "battery_temperature": 25.0,  # Default if not available
            "battery_power": data.get('battery_power', 0.0),
            "grid_power": data.get('grid_power', 0.0),
            "grid_voltage": data.get('grid_voltage', 230.0),
            "grid_frequency": data.get('grid_frequency', 50.0),
            "temperature": data.get('temperature', 45.0),
            "status": "ok"
        }
        
        return reading


# Global instance
mqtt_client: Optional[SolarAssistantMQTT] = None


def initialize_mqtt_client(host: str, port: int = 1883, username: str = None, password: str = None) -> bool:
    """
    Initialize global MQTT client for Solar Assistant
    
    Args:
        host: Solar Assistant IP address
        port: MQTT port
        username: MQTT username (optional)
        password: MQTT password (optional)
        
    Returns:
        True if connected successfully
    """
    global mqtt_client
    
    try:
        mqtt_client = SolarAssistantMQTT(host, port, username, password)
        success = mqtt_client.connect()
        
        if success:
            logger.info(f"✅ Solar Assistant MQTT client initialized successfully")
            return True
        else:
            logger.error(f"❌ Failed to connect to Solar Assistant MQTT")
            mqtt_client = None
            return False
            
    except Exception as e:
        logger.error(f"Error initializing Solar Assistant MQTT client: {e}")
        mqtt_client = None
        return False


def get_mqtt_client() -> Optional[SolarAssistantMQTT]:
    """Get the global MQTT client instance"""
    return mqtt_client
