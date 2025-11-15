"""
Service de détection automatique des onduleurs GROWATT et MPPSOLAR
"""
import serial
import serial.tools.list_ports
from pymodbus.client import ModbusSerialClient
import logging
import time
import crcmod
import struct

logger = logging.getLogger(__name__)

class InverterScanner:
    """Scanner automatique pour onduleurs GROWATT et MPPSOLAR"""
    
    def __init__(self):
        self.discovered_inverters = []
    
    def scan_all_ports(self):
        """Scan tous les ports série disponibles"""
        logger.info("🔍 Démarrage du scan des onduleurs...")
        self.discovered_inverters = []
        
        # Lister tous les ports série disponibles
        ports = serial.tools.list_ports.comports()
        logger.info(f"📡 {len(ports)} ports série détectés")
        
        for port in ports:
            logger.info(f"  Testing port: {port.device}")
            
            # Test GROWATT (Modbus RTU)
            growatt_result = self.test_growatt(port.device)
            if growatt_result:
                self.discovered_inverters.append(growatt_result)
                logger.info(f"  ✅ GROWATT détecté sur {port.device}")
                continue
            
            # Test MPPSOLAR (Protocole série)
            mppsolar_result = self.test_mppsolar(port.device)
            if mppsolar_result:
                self.discovered_inverters.append(mppsolar_result)
                logger.info(f"  ✅ MPPSOLAR détecté sur {port.device}")
        
        logger.info(f"✨ Scan terminé: {len(self.discovered_inverters)} onduleurs détectés")
        return self.discovered_inverters
    
    def test_growatt(self, port):
        """
        Test de communication Modbus RTU avec onduleur GROWATT
        Scan les slave IDs de 1 à 10 (les plus courants)
        """
        try:
            for slave_id in range(1, 11):  # Test IDs 1-10
                try:
                    client = ModbusSerialClient(
                        port=port,
                        baudrate=9600,
                        parity='N',
                        stopbits=1,
                        bytesize=8,
                        timeout=1
                    )
                    
                    if not client.connect():
                        continue
                    
                    # Essayer de lire le registre de status (register 0)
                    # GROWATT: registre 0 contient le status de l'onduleur
                    result = client.read_holding_registers(address=0, count=10, slave=slave_id)
                    
                    if not result.isError():
                        # Onduleur GROWATT détecté!
                        # Lire plus d'informations
                        model_info = self._read_growatt_info(client, slave_id)
                        
                        client.close()
                        
                        return {
                            'brand': 'GROWATT',
                            'port': port,
                            'connection_type': 'Modbus',
                            'baudrate': 9600,
                            'slave_id': slave_id,
                            'name': f"GROWATT {model_info.get('model', 'Inverter')} (Auto-détecté)",
                            'battery_capacity': model_info.get('battery_capacity', 0),
                            'model': model_info.get('model', 'Unknown'),
                            'serial': model_info.get('serial', 'Unknown')
                        }
                    
                    client.close()
                    
                except Exception as e:
                    logger.debug(f"  Slave ID {slave_id} no response: {e}")
                    continue
            
        except Exception as e:
            logger.debug(f"Error testing GROWATT on {port}: {e}")
        
        return None
    
    def _read_growatt_info(self, client, slave_id):
        """Lire les informations détaillées de l'onduleur GROWATT"""
        info = {}
        
        try:
            # Lire le numéro de série (registres 23-32 selon documentation GROWATT)
            serial_result = client.read_holding_registers(address=23, count=10, slave=slave_id)
            if not serial_result.isError():
                # Convertir les registres en string
                serial_bytes = []
                for reg in serial_result.registers:
                    serial_bytes.extend([reg >> 8, reg & 0xFF])
                serial_str = bytes(serial_bytes).decode('ascii', errors='ignore').strip('\x00')
                info['serial'] = serial_str
            
            # Lire le modèle (registres 18-22)
            model_result = client.read_holding_registers(address=18, count=5, slave=slave_id)
            if not model_result.isError():
                model_bytes = []
                for reg in model_result.registers:
                    model_bytes.extend([reg >> 8, reg & 0xFF])
                model_str = bytes(model_bytes).decode('ascii', errors='ignore').strip('\x00')
                info['model'] = model_str if model_str else 'GROWATT'
            
            # Essayer de déterminer la capacité batterie (si registre existe)
            # Note: Ce registre varie selon les modèles
            battery_result = client.read_holding_registers(address=1000, count=1, slave=slave_id)
            if not battery_result.isError():
                info['battery_capacity'] = battery_result.registers[0] / 10.0  # kWh
            
        except Exception as e:
            logger.debug(f"Error reading GROWATT info: {e}")
        
        return info
    
    def test_mppsolar(self, port):
        """
        Test de communication série avec onduleur MPPSOLAR
        Utilise la commande QID pour identifier l'onduleur
        """
        try:
            # Configuration série pour MPPSOLAR
            ser = serial.Serial(
                port=port,
                baudrate=2400,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                bytesize=serial.EIGHTBITS,
                timeout=2
            )
            
            time.sleep(0.5)  # Attendre stabilisation
            
            # Commande QID: Query serial number
            command = b'QID'
            crc = self._calculate_crc(command)
            full_command = command + crc + b'\r'
            
            ser.write(full_command)
            time.sleep(0.5)
            
            response = ser.read(100)
            ser.close()
            
            if response and len(response) > 5:
                # Réponse valide de MPPSOLAR
                # Format: (XXXXXXXXXX<CRC>\r
                response_str = response.decode('ascii', errors='ignore').strip()
                
                if response_str.startswith('(') and len(response_str) > 5:
                    # Extraire le numéro de série
                    serial_number = response_str[1:].split('\r')[0].strip()
                    
                    # Lire plus d'infos avec QPIGS
                    model_info = self._read_mppsolar_info(port)
                    
                    return {
                        'brand': 'MPPSOLAR',
                        'port': port,
                        'connection_type': 'USB',
                        'baudrate': 2400,
                        'slave_id': None,
                        'name': f"MPPSOLAR {model_info.get('model', 'PIP')} (Auto-détecté)",
                        'battery_capacity': model_info.get('battery_capacity', 0),
                        'model': model_info.get('model', 'PIP'),
                        'serial': serial_number
                    }
            
        except Exception as e:
            logger.debug(f"Error testing MPPSOLAR on {port}: {e}")
        
        return None
    
    def _read_mppsolar_info(self, port):
        """Lire les informations détaillées de l'onduleur MPPSOLAR"""
        info = {'model': 'PIP'}
        
        try:
            ser = serial.Serial(
                port=port,
                baudrate=2400,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                bytesize=serial.EIGHTBITS,
                timeout=2
            )
            
            time.sleep(0.5)
            
            # Commande QPIGS: Query status
            command = b'QPIGS'
            crc = self._calculate_crc(command)
            full_command = command + crc + b'\r'
            
            ser.write(full_command)
            time.sleep(0.5)
            
            response = ser.read(200)
            ser.close()
            
            if response and len(response) > 10:
                # Parser la réponse QPIGS pour extraire des infos
                # Format complexe avec beaucoup de valeurs séparées par espaces
                response_str = response.decode('ascii', errors='ignore').strip()
                
                if response_str.startswith('('):
                    parts = response_str[1:].split()
                    if len(parts) > 20:
                        # Batterie voltage est souvent à l'index 12-13
                        try:
                            battery_voltage = float(parts[12])
                            # Estimation capacité basée sur voltage (48V system ~ 10kWh typical)
                            if battery_voltage > 40:
                                info['battery_capacity'] = 10.0  # Estimation
                        except:
                            pass
            
        except Exception as e:
            logger.debug(f"Error reading MPPSOLAR info: {e}")
        
        return info
    
    def _calculate_crc(self, data):
        """Calcule le CRC16 pour commandes MPPSOLAR"""
        crc16 = crcmod.predefined.mkCrcFun('xmodem')
        crc = crc16(data)
        return struct.pack('>H', crc)


# Instance globale du scanner
scanner = InverterScanner()


def auto_discover_inverters():
    """Fonction principale pour découvrir les onduleurs"""
    return scanner.scan_all_ports()
