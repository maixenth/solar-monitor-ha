# 🌞 Solar Monitor - Application de Monitoring Solaire

Application web complète pour monitorer et gérer les onduleurs solaires **GROWATT** et **MPPSOLAR** sur Raspberry Pi.

![Solar Monitor](https://img.shields.io/badge/Status-Production%20Ready-success)
![Python](https://img.shields.io/badge/Python-3.8+-blue)
![React](https://img.shields.io/badge/React-18+-61DAFB)

## 🚀 Installation ULTRA RAPIDE (3 Clics)

**Sur votre Raspberry Pi :**

1. **Téléchargez** ce projet (bouton vert "Code" → "Download ZIP")
2. **Décompressez** le ZIP sur le Bureau
3. **Double-cliquez** sur `INSTALLER_SIMPLE.sh` → Choisir "Execute"
4. ☕ **Attendez 15 minutes** (l'installation se fait automatiquement)
5. **Redémarrez** quand demandé
6. **Double-cliquez** sur `start_app.sh`
7. **Ouvrez le navigateur** → `localhost:3000`

✅ **C'EST FINI !**

📖 **Guide détaillé** : Ouvrez `COMMENT_INSTALLER.txt` dans ce dossier

## 📋 Fonctionnalités

### ✨ Monitoring en Temps Réel
- **Dashboard animé** avec flux énergétique (Solaire → Batterie → Maison ← Réseau)
- Métriques en temps réel : production solaire, niveau batterie, consommation, import/export réseau
- Calcul automatique de l'autonomie batterie
- Mise à jour toutes les 5 secondes

### 📊 Visualisation de Données
- **Graphiques interactifs** (Recharts) : production, consommation, batterie, réseau
- **Charts avec filtres** : jour, semaine, mois, année, période personnalisée
- **Statistiques détaillées** : tendances, moyennes, totaux
- **Tableaux historiques** avec données granulaires

### 🔌 Gestion des Onduleurs
- **Détection automatique** des onduleurs GROWATT (Modbus) et MPPSOLAR (Serial)
- Scan manuel ou automatique au démarrage
- Ajout manuel d'onduleurs personnalisés
- Vue détaillée par onduleur avec données en temps réel

### ⚡ Gestion Énergétique (Framework)
- Configuration des priorités : Solaire, Batterie, Réseau
- Modes Auto/Manuel
- Règles de commutation configurables

### 🌐 Configuration Réseau
- **Page Paramètres** avec informations réseau complètes
- Guide d'installation Raspberry Pi intégré
- Instructions accès distant (Port Forwarding, VPN, Tunnel)

### 🎯 Modes de Fonctionnement
- **Mode SIMULATION** : Données aléatoires pour tests sans matériel
- **Mode REAL** : Lecture réelle des onduleurs connectés

## 🚀 Installation

### Prérequis
- Raspberry Pi 3/4/5 (ou tout système Linux)
- Python 3.8+, Node.js 16+, MongoDB
- Onduleurs GROWATT (RS485) ou MPPSOLAR (USB)

### Installation Rapide

```bash
# 1. Cloner le projet
cd solar-monitor

# 2. Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Frontend
cd ../frontend
yarn install

# 4. Permissions série (Raspberry Pi)
sudo usermod -a -G dialout $USER

# 5. Lancer
uvicorn server:app --host 0.0.0.0 --port 8001  # Backend
yarn start  # Frontend (autre terminal)
```

**📖 Documentation complète : [RASPBERRY_PI_SETUP.md](RASPBERRY_PI_SETUP.md)**

## 🔧 Configuration

### Backend `.env`
```bash
INVERTER_MODE="SIMULATION"  # Changer en "REAL" pour production
```

### Frontend `.env`
```bash
REACT_APP_BACKEND_URL=http://localhost:8001
```

## 📡 Communication Onduleurs

### GROWATT (Modbus RTU)
- RS485 via USB, 9600 bauds
- Lecture registres : puissance, batterie, grid

### MPPSOLAR (Serial)
- USB direct, 2400 bauds
- Commandes : QID, QPIGS

**Code:** `backend/inverter_reader.py`

## 🛠️ Dépannage

```bash
# Vérifier ports série
ls -la /dev/tty* | grep USB

# Logs
sudo supervisorctl tail -f solar-backend
```

## 📄 Licence

MIT License

---

**Développé pour la communauté solaire 🌞**
