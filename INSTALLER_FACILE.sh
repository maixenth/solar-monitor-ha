#!/bin/bash

###############################################################################
# 🌞 SOLAR MONITOR - INSTALLATION AUTOMATIQUE FACILE
# Script d'installation simplifié pour Raspberry Pi
# Pas besoin de connaître les commandes Linux !
###############################################################################

# Couleurs pour rendre les messages plus clairs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Afficher un message de bienvenue
clear
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║          🌞 SOLAR MONITOR - INSTALLATION FACILE          ║"
echo "║                                                           ║"
echo "║        Installation automatique sur Raspberry Pi         ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${BLUE}📋 Ce script va installer automatiquement tout ce dont vous avez besoin.${NC}"
echo -e "${BLUE}⏱️  Durée estimée : 10-15 minutes${NC}"
echo ""
echo -e "${YELLOW}⚠️  Vous aurez peut-être besoin d'entrer votre mot de passe.${NC}"
echo ""
read -p "Appuyez sur Entrée pour commencer l'installation..."

# Fonction pour afficher les étapes
show_step() {
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}📌 $1${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Fonction pour afficher les succès
show_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Fonction pour afficher les erreurs
show_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier que nous sommes sur un Raspberry Pi
show_step "Vérification du système"
if [ ! -f /proc/device-tree/model ]; then
    show_error "Ce script est conçu pour Raspberry Pi uniquement."
    exit 1
fi
show_success "Raspberry Pi détecté !"

# Mise à jour du système
show_step "Étape 1/8 : Mise à jour du système"
echo "⏳ Cela peut prendre quelques minutes..."
sudo apt update > /dev/null 2>&1
if [ $? -eq 0 ]; then
    show_success "Système mis à jour"
else
    show_error "Erreur lors de la mise à jour"
    exit 1
fi

# Installation des dépendances système
show_step "Étape 2/8 : Installation des logiciels nécessaires"
echo "📦 Installation de Python, Node.js, MongoDB..."
sudo apt install -y python3 python3-pip python3-venv git nodejs npm mongodb wireless-tools net-tools python3-serial python3-dev gcc > /dev/null 2>&1
if [ $? -eq 0 ]; then
    show_success "Logiciels installés"
else
    show_error "Erreur lors de l'installation des logiciels"
    exit 1
fi

# Installation de Yarn
show_step "Étape 3/8 : Installation de Yarn (gestionnaire de paquets)"
sudo npm install -g yarn > /dev/null 2>&1
show_success "Yarn installé"

# Configuration des permissions série
show_step "Étape 4/8 : Configuration des accès aux onduleurs"
echo "🔓 Ajout des permissions pour lire les onduleurs..."
sudo usermod -a -G dialout $USER
sudo usermod -a -G tty $USER
show_success "Permissions configurées"

# Démarrage de MongoDB
show_step "Étape 5/8 : Démarrage de la base de données"
sudo systemctl start mongodb
sudo systemctl enable mongodb > /dev/null 2>&1
show_success "Base de données démarrée"

# Vérifier si le dossier existe déjà
if [ -d "backend" ] && [ -d "frontend" ]; then
    INSTALL_DIR=$(pwd)
else
    # Si on exécute depuis un dossier parent, chercher les sous-dossiers
    if [ -d "solar-monitor/backend" ]; then
        cd solar-monitor
        INSTALL_DIR=$(pwd)
    else
        show_error "Impossible de trouver les fichiers de l'application."
        echo "Assurez-vous d'être dans le bon dossier."
        exit 1
    fi
fi

# Installation Backend
show_step "Étape 6/8 : Configuration du Backend (Serveur)"
cd "$INSTALL_DIR/backend"
echo "🐍 Création de l'environnement Python..."
python3 -m venv venv
source venv/bin/activate
echo "📦 Installation des bibliothèques Python..."
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt > /dev/null 2>&1
if [ $? -eq 0 ]; then
    show_success "Backend configuré"
else
    show_error "Erreur lors de l'installation du backend"
    exit 1
fi

# Vérifier et créer le fichier .env s'il n'existe pas
if [ ! -f .env ]; then
    echo "📝 Création du fichier de configuration..."
    cat > .env << EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="solar_monitor"
CORS_ORIGINS="*"

# Mode de fonctionnement: "SIMULATION" ou "REAL"
# SIMULATION: Génère des données aléatoires pour les tests
# REAL: Lit les vraies données des onduleurs connectés
INVERTER_MODE="SIMULATION"
EOF
    show_success "Configuration créée (Mode SIMULATION par défaut)"
fi

# Installation Frontend
show_step "Étape 7/8 : Configuration du Frontend (Interface Web)"
cd "$INSTALL_DIR/frontend"
echo "📦 Installation des bibliothèques JavaScript..."
yarn install > /dev/null 2>&1
if [ $? -eq 0 ]; then
    show_success "Frontend configuré"
else
    show_error "Erreur lors de l'installation du frontend"
    exit 1
fi

# Obtenir l'adresse IP locale
IP_LOCAL=$(hostname -I | awk '{print $1}')

# Vérifier et créer le fichier .env s'il n'existe pas
if [ ! -f .env ]; then
    echo "📝 Création du fichier de configuration..."
    cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
    show_success "Configuration créée"
fi

# Créer un script de démarrage facile
show_step "Étape 8/8 : Création des scripts de démarrage"
cd "$INSTALL_DIR"

# Script start_app.sh
cat > start_app.sh << 'EOF'
#!/bin/bash
echo "🌞 Démarrage de Solar Monitor..."

# Démarrer le backend
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 > /tmp/solar-backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend démarré (PID: $BACKEND_PID)"

# Attendre que le backend soit prêt
sleep 5

# Démarrer le frontend
cd ../frontend
yarn start > /tmp/solar-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend démarré (PID: $FRONTEND_PID)"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          🌞 SOLAR MONITOR EST MAINTENANT ACTIF           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Ouvrez votre navigateur et allez sur :"
echo ""
echo "   👉 http://localhost:3000"
echo ""
echo "📱 Depuis un autre appareil sur le même réseau :"
echo ""
IP_LOCAL=$(hostname -I | awk '{print $1}')
echo "   👉 http://$IP_LOCAL:3000"
echo ""
echo "🛑 Pour arrêter l'application, utilisez : ./stop_app.sh"
echo ""

# Sauvegarder les PIDs
echo $BACKEND_PID > /tmp/solar-backend.pid
echo $FRONTEND_PID > /tmp/solar-frontend.pid

# Attendre que l'utilisateur ferme
wait
EOF

# Script stop_app.sh
cat > stop_app.sh << 'EOF'
#!/bin/bash
echo "🛑 Arrêt de Solar Monitor..."

# Arrêter le backend
if [ -f /tmp/solar-backend.pid ]; then
    BACKEND_PID=$(cat /tmp/solar-backend.pid)
    kill $BACKEND_PID 2>/dev/null
    echo "✅ Backend arrêté"
    rm /tmp/solar-backend.pid
fi

# Arrêter le frontend
if [ -f /tmp/solar-frontend.pid ]; then
    FRONTEND_PID=$(cat /tmp/solar-frontend.pid)
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Frontend arrêté"
    rm /tmp/solar-frontend.pid
fi

# Tuer tous les processus restants
pkill -f "uvicorn server:app"
pkill -f "yarn start"

echo "✅ Solar Monitor arrêté complètement"
EOF

# Script restart_app.sh
cat > restart_app.sh << 'EOF'
#!/bin/bash
echo "🔄 Redémarrage de Solar Monitor..."
./stop_app.sh
sleep 2
./start_app.sh
EOF

# Rendre les scripts exécutables
chmod +x start_app.sh
chmod +x stop_app.sh
chmod +x restart_app.sh

show_success "Scripts de démarrage créés"

# Installation terminée !
clear
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║          ✅ INSTALLATION TERMINÉE AVEC SUCCÈS !          ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}🎉 Solar Monitor est maintenant installé sur votre Raspberry Pi !${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 PROCHAINES ÉTAPES :"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  Démarrer l'application :"
echo "    Dans ce dossier, tapez : ${YELLOW}./start_app.sh${NC}"
echo ""
echo "2️⃣  Ouvrir l'application :"
echo "    🌐 Navigateur → ${BLUE}http://localhost:3000${NC}"
echo ""
echo "3️⃣  Connecter votre onduleur :"
echo "    🔌 Branchez le câble USB"
echo "    📡 Dans l'application → Onduleurs → Scanner automatiquement"
echo ""
echo "4️⃣  Passer en mode RÉEL (quand onduleur connecté) :"
echo "    ⚙️  Dans l'application → Paramètres → Mode REAL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 Accès depuis téléphone/PC (même WiFi) :"
echo "    ${BLUE}http://$IP_LOCAL:3000${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT : Pour que les permissions prennent effet,"
echo "    vous devez ${YELLOW}redémarrer votre Raspberry Pi${NC} OU vous déconnecter/reconnecter."
echo ""
read -p "Voulez-vous redémarrer maintenant ? (o/n) : " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Oo]$ ]]; then
    echo "🔄 Redémarrage en cours..."
    sleep 2
    sudo reboot
else
    echo "✅ Pensez à redémarrer plus tard pour finaliser l'installation !"
    echo ""
    echo "Pour démarrer l'application maintenant, tapez : ${YELLOW}./start_app.sh${NC}"
fi

echo ""
echo "📚 Documentation complète : ${BLUE}INSTALLATION_FACILE.md${NC}"
echo ""
echo "🌞 Profitez de Solar Monitor ! 🌞"
echo ""
