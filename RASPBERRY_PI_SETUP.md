# Guide d'Installation - Solar Monitor sur Raspberry Pi

Ce guide vous accompagne dans l'installation et la configuration de l'application Solar Monitor sur un Raspberry Pi pour monitorer vos onduleurs GROWATT et MPPSOLAR.

## 📋 Prérequis

- Raspberry Pi 3/4/5 avec Raspberry Pi OS (Bookworm ou Bullseye)
- Onduleur GROWATT (connexion RS485 via Modbus RTU) ou MPPSOLAR (connexion USB série)
- Câble de connexion approprié :
  - **GROWATT**: Adaptateur USB-RS485 (FTDI ou CH340)
  - **MPPSOLAR**: Câble USB direct
- Connexion Internet (pour l'installation initiale)
- Accès SSH ou clavier/écran connecté au Raspberry Pi

## 🔧 Installation Système

### 1. Mise à jour du système

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Installation des dépendances système

```bash
# Outils de développement
sudo apt install -y git python3-pip python3-venv nodejs npm mongodb

# Bibliothèques pour communication série
sudo apt install -y python3-serial python3-dev gcc

# Outils réseau (pour iwconfig, ifconfig)
sudo apt install -y wireless-tools net-tools
```

### 3. Configuration des permissions série

Pour permettre à l'application de lire les onduleurs sans sudo :

```bash
# Ajouter l'utilisateur au groupe dialout
sudo usermod -a -G dialout $USER

# Ajouter également au groupe tty
sudo usermod -a -G tty $USER

# Se déconnecter et reconnecter pour appliquer les changements
# Ou utiliser cette commande temporaire:
newgrp dialout
```

### 4. Vérifier les ports série disponibles

```bash
# Lister tous les ports série
ls -la /dev/tty*

# Ports USB typiques:
# /dev/ttyUSB0, /dev/ttyUSB1 (adaptateurs USB-série)
# /dev/ttyACM0, /dev/ttyACM1 (Arduino, certains onduleurs)

# Vérifier les périphériques USB connectés
lsusb

# Surveiller les messages système lors de la connexion USB
sudo dmesg | grep tty
```

## 📦 Installation de l'Application

### 1. Cloner le repository (ou transférer les fichiers)

```bash
cd /home/pi
git clone <your-repo-url> solar-monitor
cd solar-monitor
```

### 2. Configuration Backend (Python/FastAPI)

```bash
cd backend

# Créer environnement virtuel
python3 -m venv venv
source venv/bin/activate

# Installer les dépendances
pip install --upgrade pip
pip install -r requirements.txt

# Configuration .env
cp .env.example .env  # Si vous avez un fichier exemple
nano .env

# Contenu du .env:
# MONGO_URL="mongodb://localhost:27017"
# DB_NAME="solar_monitor"
# CORS_ORIGINS="*"
# INVERTER_MODE="REAL"  ⚠️ Mettre "REAL" pour mode production!
```

### 3. Configuration Frontend (React)

```bash
cd ../frontend

# Installer Yarn si nécessaire
npm install -g yarn

# Installer les dépendances
yarn install

# Configuration .env
nano .env

# Contenu du .env:
# REACT_APP_BACKEND_URL=http://localhost:8001
# Pour accès distant, remplacer par votre IP:
# REACT_APP_BACKEND_URL=http://192.168.1.100:8001
```

### 4. Démarrer MongoDB

```bash
# Démarrer MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Vérifier le statut
sudo systemctl status mongodb
```

## 🚀 Lancement de l'Application

### Mode Développement (pour tests)

**Terminal 1 - Backend:**
```bash
cd /home/pi/solar-monitor/backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Frontend:**
```bash
cd /home/pi/solar-monitor/frontend
yarn start
```

L'application sera accessible sur:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- Depuis un autre appareil: http://[IP_RASPBERRY]:3000

### Mode Production (avec Supervisor)

Supervisor permet de lancer automatiquement l'application au démarrage.

#### Installation de Supervisor

```bash
sudo apt install -y supervisor
```

#### Configuration Backend

Créer le fichier `/etc/supervisor/conf.d/solar-backend.conf`:

```bash
sudo nano /etc/supervisor/conf.d/solar-backend.conf
```

Contenu:
```ini
[program:solar-backend]
command=/home/pi/solar-monitor/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
directory=/home/pi/solar-monitor/backend
user=pi
autostart=true
autorestart=true
stderr_logfile=/var/log/solar-backend.err.log
stdout_logfile=/var/log/solar-backend.out.log
environment=PATH="/home/pi/solar-monitor/backend/venv/bin"
```

#### Configuration Frontend

Créer le fichier `/etc/supervisor/conf.d/solar-frontend.conf`:

```bash
sudo nano /etc/supervisor/conf.d/solar-frontend.conf
```

Contenu:
```ini
[program:solar-frontend]
command=/usr/bin/yarn start
directory=/home/pi/solar-monitor/frontend
user=pi
autostart=true
autorestart=true
stderr_logfile=/var/log/solar-frontend.err.log
stdout_logfile=/var/log/solar-frontend.out.log
environment=PATH="/usr/bin:/usr/local/bin"
```

#### Activer et démarrer

```bash
# Recharger la configuration
sudo supervisorctl reread
sudo supervisorctl update

# Démarrer les services
sudo supervisorctl start solar-backend
sudo supervisorctl start solar-frontend

# Vérifier le statut
sudo supervisorctl status

# Commandes utiles:
sudo supervisorctl restart solar-backend
sudo supervisorctl restart solar-frontend
sudo supervisorctl tail -f solar-backend
```

## 🔌 Configuration des Onduleurs

### Test de connexion GROWATT (Modbus)

```bash
cd /home/pi/solar-monitor/backend
source venv/bin/activate
python3

# Dans l'interpréteur Python:
from pymodbus.client import ModbusSerialClient

client = ModbusSerialClient(
    port='/dev/ttyUSB0',  # Adapter selon votre port
    baudrate=9600,
    parity='N',
    stopbits=1,
    bytesize=8,
    timeout=3
)

if client.connect():
    print("✅ Connexion Modbus réussie!")
    
    # Tester lecture registre 0 avec slave ID 1
    result = client.read_holding_registers(address=0, count=10, slave=1)
    
    if not result.isError():
        print(f"✅ Données lues: {result.registers}")
    else:
        print(f"❌ Erreur lecture: {result}")
        # Essayer avec d'autres slave IDs (1-10)
    
    client.close()
else:
    print("❌ Impossible de se connecter au port série")
```

### Test de connexion MPPSOLAR (Serial)

```bash
cd /home/pi/solar-monitor/backend
source venv/bin/activate
python3

# Dans l'interpréteur Python:
import serial
import time

ser = serial.Serial(
    port='/dev/ttyUSB0',  # Adapter selon votre port
    baudrate=2400,
    timeout=3
)

time.sleep(0.5)

# Commande QID (Query ID)
command = b'QID\xbe\xac\r'  # QID avec CRC
ser.write(command)
time.sleep(0.5)

response = ser.read(100)
print(f"Réponse: {response}")

if response and response.startswith(b'('):
    print("✅ Onduleur MPPSOLAR détecté!")
else:
    print("❌ Pas de réponse valide")

ser.close()
```

### Détecter automatiquement les ports

L'application dispose d'un scanner automatique accessible via:
1. Interface web → Page "Onduleurs" → Bouton "Scanner automatiquement"
2. Ou au démarrage de l'application (auto-discovery)

## 📱 Accès Distant

### Option 1: Port Forwarding (Recommandé)

1. Accéder à votre box/routeur (ex: 192.168.1.1)
2. Section "NAT" ou "Redirection de ports"
3. Créer règles:
   - Port externe 3000 → IP_RASPBERRY:3000 (Frontend)
   - Port externe 8001 → IP_RASPBERRY:8001 (Backend)
4. Accès depuis Internet: http://VOTRE_IP_PUBLIQUE:3000

⚠️ **Sécurité**: Utilisez un mot de passe fort et considérez un VPN!

### Option 2: VPN (Plus sécurisé)

```bash
# Installer WireGuard
sudo apt install -y wireguard

# Configuration selon la documentation WireGuard
# https://www.wireguard.com/quickstart/
```

### Option 3: Tunnel ngrok/localtunnel

```bash
# Installer localtunnel
sudo npm install -g localtunnel

# Créer tunnel vers frontend
lt --port 3000 --subdomain solar-monitor

# URL publique générée: https://solar-monitor.loca.lt
```

## 🔍 Dépannage

### Les onduleurs ne sont pas détectés

```bash
# Vérifier les permissions
groups  # Doit contenir 'dialout'

# Vérifier les ports
ls -la /dev/tty* | grep USB

# Vérifier les logs backend
sudo supervisorctl tail -f solar-backend

# Tester manuellement la connexion (voir section tests ci-dessus)
```

### Erreur "Permission denied" sur /dev/ttyUSB0

```bash
# Ajouter permissions temporaires
sudo chmod 666 /dev/ttyUSB0

# Solution permanente: ajouter au groupe dialout
sudo usermod -a -G dialout pi
# Se déconnecter/reconnecter
```

### Mode SIMULATION au lieu de REAL

```bash
# Vérifier la configuration
cat /home/pi/solar-monitor/backend/.env | grep INVERTER_MODE

# Doit être:
# INVERTER_MODE="REAL"

# Si incorrect:
nano /home/pi/solar-monitor/backend/.env
# Changer en INVERTER_MODE="REAL"

# Redémarrer backend
sudo supervisorctl restart solar-backend
```

### Backend ne démarre pas

```bash
# Voir les logs
sudo supervisorctl tail solar-backend

# Logs détaillés
tail -f /var/log/solar-backend.err.log

# Erreurs communes:
# - MongoDB non démarré: sudo systemctl start mongodb
# - Port déjà utilisé: sudo lsof -i :8001
# - Dépendances manquantes: pip install -r requirements.txt
```

### Frontend ne se charge pas

```bash
# Vérifier que le backend répond
curl http://localhost:8001/api/

# Vérifier la variable d'environnement
cat /home/pi/solar-monitor/frontend/.env

# Voir les logs
sudo supervisorctl tail solar-frontend
tail -f /var/log/solar-frontend.err.log
```

## 📊 Configuration IP Statique (Recommandé)

Pour éviter que l'IP change et casser l'accès distant:

```bash
sudo nano /etc/dhcpcd.conf
```

Ajouter à la fin:
```
interface wlan0  # ou eth0 pour Ethernet
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 8.8.4.4
```

Redémarrer:
```bash
sudo reboot
```

## 🔒 Sécurité

### Recommandations essentielles:

1. **Changer le mot de passe par défaut du Raspberry Pi**
   ```bash
   passwd
   ```

2. **Activer le pare-feu**
   ```bash
   sudo apt install -y ufw
   sudo ufw allow 22    # SSH
   sudo ufw allow 3000  # Frontend
   sudo ufw allow 8001  # Backend (optionnel si accès local uniquement)
   sudo ufw enable
   ```

3. **Fail2Ban pour SSH**
   ```bash
   sudo apt install -y fail2ban
   sudo systemctl enable fail2ban
   ```

4. **Mises à jour régulières**
   ```bash
   sudo apt update && sudo apt upgrade -y
   # À faire toutes les semaines
   ```

## 📝 Maintenance

### Sauvegardes

```bash
# Sauvegarder la base de données
mongodump --db solar_monitor --out /home/pi/backups/mongodb_$(date +%Y%m%d)

# Restaurer
mongorestore --db solar_monitor /home/pi/backups/mongodb_20240101/solar_monitor
```

### Logs

```bash
# Voir les logs en direct
sudo supervisorctl tail -f solar-backend
sudo supervisorctl tail -f solar-frontend

# Logs MongoDB
sudo journalctl -u mongodb -f

# Nettoyer les vieux logs (si trop volumineux)
sudo truncate -s 0 /var/log/solar-backend.out.log
```

## 📞 Support

Pour toute question ou problème:
- Vérifier les logs: `sudo supervisorctl tail solar-backend`
- Tester en mode manuel (sans supervisor) pour isoler le problème
- Vérifier que le mode est bien sur "REAL" dans .env

---

**Bonne installation! 🎉🌞**
