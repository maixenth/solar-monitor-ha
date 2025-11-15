"""
Service de lecture RÉELLE des données des onduleurs GROWATT et MPPSOLAR
"""
import logging
import struct
import crcmod
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from pymodbus.client import ModbusSerialClient
import serial
import time

logger = logging.getLogger(__name__)


class InverterReader:
    """Classe pour lire les données réelles des onduleurs"""
    
    def __init__(self):
        self.growatt_clients = {}  # Cache des clients Modbus
        self.mppsolar_connections = {}  # Cache des connexions série
    
    def read_inverter(self, inverter_config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Lit les données d'un onduleur selon sa configuration
        
        Args:
            inverter_config: Configuration de l'onduleur avec port, brand, slave_id, etc.
        
        Returns:
            Dictionnaire avec les données lues ou None en cas d'erreur
        """
        brand = inverter_config.get('brand', '').upper()
        
        try:
            if brand == 'GROWATT':
                return self.read_growatt(inverter_config)
            elif brand == 'MPPSOLAR':
                return self.read_mppsolar(inverter_config)
            else:
                logger.error(f"Brand {brand} non supportée")
                return None
        except Exception as e:
            logger.error(f"Erreur lecture onduleur {brand} sur {inverter_config.get('port')}: {e}")
            return None
    
    def read_growatt(self, config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Lit les données d'un onduleur GROWATT via Modbus RTU
        
        Registres GROWATT (documentation officielle):
        - 0-2: Status, Puissance PV1, Puissance PV2
        - 3-10: Tensions et courants DC
        - 11-20: Puissance AC, tension, courant, fréquence
        - 53: Température
        - 59-61: Énergie aujourd'hui, totale
        - 1000-1010: Batterie (selon modèle)
        """
        port = config['port']
        slave_id = config.get('slave_id', 1)
        baudrate = config.get('baudrate', 9600)
        
        try:
            # Créer ou récupérer le client Modbus
            client_key = f"{port}_{slave_id}"
            if client_key not in self.growatt_clients:
                client = ModbusSerialClient(
                    port=port,
                    baudrate=baudrate,
                    parity='N',
                    stopbits=1,
                    bytesize=8,
                    timeout=3
                )
                if not client.connect():
                    logger.error(f"Impossible de se connecter au port {port}")
                    return None
                self.growatt_clients[client_key] = client
            else:
                client = self.growatt_clients[client_key]
            
            # Lire les registres principaux (0-65)
            result = client.read_holding_registers(address=0, count=65, slave=slave_id)
            
            if result.isError():
                logger.error(f"Erreur Modbus lecture registres 0-65: {result}")
                return None
            
            registers = result.registers
            
            # Parser les données selon la documentation GROWATT
            data = {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'status': 'ok' if registers[0] == 1 else 'error',
                
                # Puissance DC (PV)
                'dc_power': (registers[1] + registers[2]) / 10.0,  # W (PV1 + PV2)
                'dc_voltage': registers[3] / 10.0,  # V
                'dc_current': registers[4] / 10.0,  # A
                
                # Puissance AC
                'ac_power': (registers[11] << 16 | registers[12]) / 10.0,  # W
                'ac_voltage': registers[13] / 10.0,  # V
                'ac_current': registers[14] / 10.0,  # A
                'frequency': registers[15] / 100.0,  # Hz
                
                # Température
                'temperature': registers[53] / 10.0,  # °C
                
                # Énergie
                'energy_today': (registers[59] << 16 | registers[60]) / 10.0,  # kWh
                'energy_total': (registers[61] << 16 | registers[62]) / 10.0,  # kWh
            }
            
            # Lire les données batterie si disponibles (registres 1000+)
            try:
                battery_result = client.read_holding_registers(address=1000, count=20, slave=slave_id)
                if not battery_result.isError():
                    bat_regs = battery_result.registers
                    data.update({
                        'battery_voltage': bat_regs[0] / 10.0,  # V
                        'battery_current': bat_regs[1] / 10.0,  # A (positif=charge, négatif=décharge)
                        'battery_soc': bat_regs[2],  # %
                        'battery_power': (bat_regs[0] / 10.0) * (bat_regs[1] / 10.0),  # W
                        'battery_temperature': bat_regs[3] / 10.0 if len(bat_regs) > 3 else 25.0,  # °C
                    })
            except Exception as e:
                logger.debug(f"Pas de données batterie disponibles: {e}")
            
            # Lire les données réseau/grid si disponibles (registres 2000+)
            try:
                grid_result = client.read_holding_registers(address=2000, count=10, slave=slave_id)
                if not grid_result.isError():
                    grid_regs = grid_result.registers
                    data.update({
                        'grid_voltage': grid_regs[0] / 10.0,  # V
                        'grid_frequency': grid_regs[1] / 100.0,  # Hz
                        'grid_power': grid_regs[2] / 10.0,  # W (positif=import, négatif=export)
                    })
            except Exception as e:
                logger.debug(f"Pas de données réseau disponibles: {e}")
            
            logger.debug(f"✅ GROWATT lu avec succès: {data['ac_power']}W")
            return data
            
        except Exception as e:
            logger.error(f"Erreur lecture GROWATT: {e}")
            # Fermer la connexion en cas d'erreur
            if client_key in self.growatt_clients:
                try:
                    self.growatt_clients[client_key].close()
                except:
                    pass
                del self.growatt_clients[client_key]
            return None
    
    def read_mppsolar(self, config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Lit les données d'un onduleur MPPSOLAR via Serial
        
        Commandes principales:
        - QPIGS: Query device general status (le plus complet)
        - QPI: Query device protocol ID
        - QMOD: Query device mode
        """
        port = config['port']
        baudrate = config.get('baudrate', 2400)
        
        try:
            # Ouvrir connexion série
            ser = serial.Serial(
                port=port,
                baudrate=baudrate,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                bytesize=serial.EIGHTBITS,
                timeout=3
            )
            
            time.sleep(0.3)  # Attendre stabilisation
            
            # Envoyer commande QPIGS (Query General Status)
            command = b'QPIGS'
            crc = self._calculate_crc(command)
            full_command = command + crc + b'\r'
            
            ser.write(full_command)
            time.sleep(0.5)
            
            response = ser.read(200)
            ser.close()
            
            if not response or len(response) < 20:
                logger.error(f"Réponse MPPSOLAR invalide ou trop courte")
                return None
            
            # Parser la réponse QPIGS
            # Format: (AAA.A BB.B CCC.C DD.D EEEE FFFF GGG HHH II.I JJJ KK LLL MMMM NN.NN OOO.O PPP.P QQQ RRR SS.SS TTTTTT UU VVVVVVVV WW<CRC>\r
            response_str = response.decode('ascii', errors='ignore').strip()
            
            if not response_str.startswith('('):
                logger.error(f"Format réponse MPPSOLAR invalide: {response_str[:50]}")
                return None
            
            # Extraire les valeurs
            # Retirer '(' au début et '\r' + CRC à la fin
            values_str = response_str[1:].split('\r')[0]
            # Retirer les 2 derniers caractères (CRC)
            values_str = values_str[:-2] if len(values_str) > 2 else values_str
            values = values_str.split()
            
            if len(values) < 20:
                logger.error(f"Pas assez de valeurs dans la réponse QPIGS: {len(values)}")
                return None
            
            # Mapping des valeurs selon documentation MPPSOLAR
            # Index: 0=Grid V, 1=Grid Freq, 2=AC Out V, 3=AC Out Freq, 4=AC Out VA, 
            #        5=AC Out W, 6=Load %, 7=Bus V, 8=Bat V, 9=Bat Charge A,
            #        10=Bat Capacity %, 11=Temp, 12=PV A, 13=PV V, 14=Bat SCC V,
            #        15=Bat Discharge A, 16=Device Status
            
            data = {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'status': 'ok',
                
                # Grid (réseau)
                'grid_voltage': float(values[0]),  # V
                'grid_frequency': float(values[1]),  # Hz
                'grid_power': 0.0,  # Calculé plus tard
                
                # AC Output (sortie onduleur vers maison)
                'ac_voltage': float(values[2]),  # V
                'ac_current': float(values[5]) / float(values[2]) if float(values[2]) > 0 else 0,  # A
                'ac_power': float(values[5]),  # W (puissance active)
                'frequency': float(values[3]),  # Hz
                
                # PV (panneaux solaires)
                'dc_voltage': float(values[13]),  # V
                'dc_current': float(values[12]),  # A
                'dc_power': float(values[13]) * float(values[12]),  # W
                
                # Battery (batterie)
                'battery_voltage': float(values[8]),  # V
                'battery_current': float(values[9]) - float(values[15]),  # A (charge - décharge)
                'battery_soc': float(values[10]),  # %
                'battery_power': float(values[8]) * (float(values[9]) - float(values[15])),  # W
                'battery_temperature': float(values[11]),  # °C
                
                # Température onduleur
                'temperature': float(values[11]),  # °C
                
                # Énergie (estimation basée sur puissance)
                'energy_today': 0.0,  # Pas directement disponible dans QPIGS
                'energy_total': 0.0,  # Pas directement disponible dans QPIGS
            }
            
            # Déterminer la puissance grid (import/export)
            # Si PV + Batterie < Load, alors import du grid
            load_power = float(values[5])  # W
            pv_power = data['dc_power']
            battery_power = data['battery_power']
            
            # Grid power = Load - (PV + Battery)
            # Positif = import, Négatif = export
            data['grid_power'] = load_power - (pv_power + battery_power)
            
            logger.debug(f"✅ MPPSOLAR lu avec succès: {data['ac_power']}W")
            return data
            
        except Exception as e:
            logger.error(f"Erreur lecture MPPSOLAR: {e}")
            try:
                ser.close()
            except:
                pass
            return None
    
    def _calculate_crc(self, data: bytes) -> bytes:
        """Calcule le CRC16 XMODEM pour commandes MPPSOLAR"""
        crc16 = crcmod.predefined.mkCrcFun('xmodem')
        crc = crc16(data)
        return struct.pack('>H', crc)
    
    def close_all_connections(self):
        """Ferme toutes les connexions ouvertes"""
        # Fermer clients Modbus
        for client_key, client in self.growatt_clients.items():
            try:
                client.close()
                logger.info(f"Connexion Modbus {client_key} fermée")
            except Exception as e:
                logger.error(f"Erreur fermeture {client_key}: {e}")
        
        self.growatt_clients.clear()
        self.mppsolar_connections.clear()


# Instance globale du reader
reader = InverterReader()


def read_inverter_data(inverter_config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Fonction principale pour lire les données d'un onduleur"""
    return reader.read_inverter(inverter_config)


def close_all_connections():
    """Ferme toutes les connexions aux onduleurs"""
    reader.close_all_connections()
