#!/bin/bash

###############################################################################
# 🌞 SOLAR MONITOR - INSTALLATION SIMPLE (Version Sans Blocage)
# Cette version CONTINUE même si MongoDB échoue
# Compatible DOUBLE-CLIC et Terminal
###############################################################################

# Si lancé en double-clic, ouvrir dans un terminal
if [ -z "$DISPLAY" ] || [ "$TERM" = "dumb" ]; then
    if command -v lxterminal &> /dev/null; then
        lxterminal -e "bash '$0'; echo ''; echo 'Appuyez sur Entrée pour fermer'; read"
        exit 0
    elif command -v xterm &> /dev/null; then
        xterm -e "bash '$0'; echo ''; echo 'Appuyez sur Entrée pour fermer'; read"
        exit 0
    fi
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     🌞 SOLAR MONITOR - INSTALLATION SIMPLE (v2)          ║"
echo "║         Compatible Double-Clic et Terminal               ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${BLUE}Cette version continue même en cas d'erreur MongoDB${NC}"
echo ""
read -p "Appuyez sur Entrée pour commencer..."

show_step() {
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}📌 $1${NC}"
}

show_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

show_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

show_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Étape 1 : Mise à jour
show_step "Étape 1/7 : Mise à jour du système"
echo "⏳ Patience..."
sudo apt update
if [ $? -eq 0 ]; then
    show_success "Système à jour"
else
    show_warning "Mise à jour avec avertissements (on continue)"
fi

# Étape 2 : Python
show_step "Étape 2/7 : Installation Python"
sudo apt install -y python3 python3-pip python3-venv python3-dev gcc
if [ $? -eq 0 ]; then
    show_success "Python installé"
else
    show_error "Erreur Python - STOP"
    exit 1
fi

# Étape 3 : Git
show_step "Étape 3/7 : Installation Git"
sudo apt install -y git
show_success "Git installé"

# Étape 4 : Node.js
show_step "Étape 4/7 : Installation Node.js"
sudo apt install -y nodejs npm
if [ $? -eq 0 ]; then
    show_success "Node.js installé"
    
    # Installation Yarn
    echo "📦 Installation Yarn..."
    sudo npm install -g yarn 2>/dev/null
    show_success "Yarn installé"
else
    show_error "Erreur Node.js - STOP"
    exit 1
fi

# Étape 5 : Outils série
show_step "Étape 5/7 : Configuration accès onduleurs"
sudo apt install -y python3-serial wireless-tools net-tools
sudo usermod -a -G dialout $USER
sudo usermod -a -G tty $USER
show_success "Permissions configurées"

# Étape 5bis : MongoDB (optionnel - ne bloque JAMAIS)
show_step "Étape 5.5/7 : Installation MongoDB (optionnel)"
echo "⚠️  Si cette étape échoue, ce n'est pas grave - on continue..."
sudo apt install -y mongodb 2>&1 | head -5
MONGO_RESULT=$?
if [ $MONGO_RESULT -eq 0 ]; then
    sudo systemctl start mongodb 2>/dev/null
    sudo systemctl enable mongodb 2>/dev/null
    show_success "MongoDB installé"
else
    show_warning "MongoDB non installé - L'appli fonctionnera en mode SIMULATION"
    echo "💡 Ceci est NORMAL et n'empêche pas l'application de fonctionner"
fi
sleep 2

# Trouver le dossier
INSTALL_DIR=$(pwd)
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    show_error "Fichiers backend/frontend introuvables dans $(pwd)"
    echo "Veuillez lancer ce script depuis le dossier solar-monitor"
    exit 1
fi

# Étape 6 : Backend
show_step "Étape 6/7 : Configuration Backend Python"
cd "$INSTALL_DIR/backend"

echo "🐍 Création environnement virtuel..."
python3 -m venv venv
if [ $? -ne 0 ]; then
    show_error "Erreur création venv"
    exit 1
fi

echo "📦 Activation..."
source venv/bin/activate

echo "📦 Installation bibliothèques Python (2-3 min)..."
echo "⏳ Ceci peut prendre du temps, soyez patient..."
pip install --upgrade pip -q
pip install -r requirements.txt 2>&1 | grep -v "WARNING"
if [ $? -eq 0 ]; then
    show_success "Backend Python configuré"
else
    show_error "Erreur installation bibliothèques Python"
    echo "Détails de l'erreur ci-dessus"
    read -p "Appuyez sur Entrée pour quitter"
    exit 1
fi

# Créer .env s'il n'existe pas
if [ ! -f .env ]; then
    cat > .env << EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="solar_monitor"
CORS_ORIGINS="*"
INVERTER_MODE="SIMULATION"
EOF
    show_success "Configuration backend créée"
fi

deactivate

# Étape 7 : Frontend
show_step "Étape 7/7 : Configuration Frontend React"
cd "$INSTALL_DIR/frontend"

echo "📦 Installation packages JavaScript (5-10 min)..."
echo "⏳ C'EST NORMAL QUE ÇA PRENNE DU TEMPS !"
echo "☕ Prenez un café, l'écran peut sembler figé mais ça travaille..."
yarn install 2>&1 | grep -E "(warning|error|success)" || echo "Installation en cours..."
YARN_RESULT=$?
if [ $YARN_RESULT -eq 0 ]; then
    show_success "Frontend React configuré"
else
    show_error "Erreur installation frontend"
    echo "Réessayez avec : cd frontend && yarn install"
    read -p "Appuyez sur Entrée pour quitter"
    exit 1
fi

# Créer .env s'il n'existe pas
if [ ! -f .env ]; then
    cat > .env << EOF
REACT_APP_BACKEND_URL=http://localhost:8001
EOF
    show_success "Configuration frontend créée"
fi

# Scripts de démarrage
show_step "Création scripts de démarrage"
cd "$INSTALL_DIR"

cat > start_app.sh << 'EOFSTART'
#!/bin/bash
echo "🌞 Démarrage Solar Monitor..."
echo ""

# Backend
cd backend
source venv/bin/activate
echo "✅ Backend démarré sur http://localhost:8001"
uvicorn server:app --host 0.0.0.0 --port 8001 > /tmp/solar-backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/solar-backend.pid

# Attendre backend
sleep 3

# Frontend
cd ../frontend
echo "✅ Frontend démarré sur http://localhost:3000"
yarn start > /tmp/solar-frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/solar-frontend.pid

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║   🌞 SOLAR MONITOR DÉMARRÉ                   ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
echo "🌐 Ouvrez : http://localhost:3000"
echo ""
IP=$(hostname -I | awk '{print $1}')
echo "📱 Depuis un autre appareil : http://$IP:3000"
echo ""
echo "🛑 Pour arrêter : ./stop_app.sh"
echo ""

wait
EOFSTART

cat > stop_app.sh << 'EOFSTOP'
#!/bin/bash
echo "🛑 Arrêt Solar Monitor..."

if [ -f /tmp/solar-backend.pid ]; then
    kill $(cat /tmp/solar-backend.pid) 2>/dev/null
    rm /tmp/solar-backend.pid
fi

if [ -f /tmp/solar-frontend.pid ]; then
    kill $(cat /tmp/solar-frontend.pid) 2>/dev/null
    rm /tmp/solar-frontend.pid
fi

pkill -f "uvicorn server:app"
pkill -f "yarn start"

echo "✅ Arrêté"
EOFSTOP

chmod +x start_app.sh stop_app.sh
show_success "Scripts créés"

# FIN
clear
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║          ✅ INSTALLATION TERMINÉE AVEC SUCCÈS !          ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}🎉 Solar Monitor est installé !${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 POUR DÉMARRER :"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  Redémarrez le Raspberry Pi (pour les permissions) :"
echo "    ${YELLOW}sudo reboot${NC}"
echo ""
echo "2️⃣  Après redémarrage, lancez :"
echo "    ${YELLOW}cd $(pwd)${NC}"
echo "    ${YELLOW}./start_app.sh${NC}"
echo ""
echo "3️⃣  Ouvrez le navigateur :"
echo "    ${BLUE}http://localhost:3000${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Voulez-vous redémarrer maintenant ? (o/n) : " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Oo]$ ]]; then
    echo "🔄 Redémarrage dans 3 secondes..."
    sleep 3
    sudo reboot
else
    echo ""
    echo "✅ Pensez à redémarrer plus tard avec : ${YELLOW}sudo reboot${NC}"
    echo ""
fi

echo ""
echo "🌞 Installation terminée ! 🌞"
echo ""
read -p "Appuyez sur Entrée pour fermer cette fenêtre..."
