"""Service pour récupérer les informations réseau du système"""
import socket
import subprocess
import logging
import requests
import netifaces
import platform

logger = logging.getLogger(__name__)

def get_network_info():
    """Récupère toutes les informations réseau du système"""
    info = {
        'hostname': socket.gethostname(),
        'platform': platform.system(),
        'interfaces': [],
        'public_ip': None,
        'local_ips': [],
        'wifi_ssid': None,
        'wifi_signal': None,
        'gateway': None
    }
    
    try:
        # Interfaces réseau
        for interface in netifaces.interfaces():
            if interface == 'lo':  # Skip loopback
                continue
            
            addrs = netifaces.ifaddresses(interface)
            if netifaces.AF_INET in addrs:
                for addr in addrs[netifaces.AF_INET]:
                    ip = addr.get('addr')
                    if ip and not ip.startswith('127.'):
                        info['interfaces'].append({
                            'name': interface,
                            'ip': ip,
                            'netmask': addr.get('netmask'),
                            'type': 'wifi' if 'wlan' in interface or 'wlp' in interface else 'ethernet'
                        })
                        info['local_ips'].append(ip)
        
        # Gateway
        try:
            gateways = netifaces.gateways()
            if 'default' in gateways and netifaces.AF_INET in gateways['default']:
                info['gateway'] = gateways['default'][netifaces.AF_INET][0]
        except:
            pass
        
        # IP publique
        try:
            response = requests.get('https://api.ipify.org?format=json', timeout=5)
            if response.status_code == 200:
                info['public_ip'] = response.json().get('ip')
        except:
            logger.warning("Could not fetch public IP")
        
        # WiFi SSID (Linux)
        if platform.system() == 'Linux':
            try:
                result = subprocess.run(
                    ['iwgetid', '-r'],
                    capture_output=True,
                    text=True,
                    timeout=2
                )
                if result.returncode == 0:
                    info['wifi_ssid'] = result.stdout.strip()
                    
                # Signal WiFi
                result = subprocess.run(
                    ['iwconfig'],
                    capture_output=True,
                    text=True,
                    timeout=2
                )
                if result.returncode == 0:
                    for line in result.stdout.split('\n'):
                        if 'Signal level' in line:
                            parts = line.split('Signal level=')
                            if len(parts) > 1:
                                signal = parts[1].split()[0]
                                info['wifi_signal'] = signal
            except:
                pass
    
    except Exception as e:
        logger.error(f"Error getting network info: {e}")
    
    return info
