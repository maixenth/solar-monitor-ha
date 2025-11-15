#!/bin/bash

###############################################################################
# 🌞 SOLAR MONITOR - INSTALLATION UBUNTU/LINUX DESKTOP
# Version optimisée pour Ubuntu 20.04+ / Debian / Linux Mint
###############################################################################

# Si lancé en double-clic, ouvrir dans un terminal
if [ -z "$DISPLAY" ] || [ "$TERM" = "dumb" ]; then
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "bash '$0'; echo ''; echo 'Appuyez sur Entrée pour fermer'; read"
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
echo "║     🌞 SOLAR MONITOR - INSTALLATION UBUNTU/LINUX         ║"
echo "║         Version Optimisée pour PC/Laptop                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${BLUE}Installation pour Ubuntu 20.04+ / Debian / Linux Mint${NC}"
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

# Trouver où on est
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Vérifier qu'on a les bons dossiers
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    show_error "Dossiers backend/frontend introuvables !"
    echo "Ce script doit être dans le dossier solar-monitor"
    read -p "Appuyez sur Entrée pour fermer"
    exit 1
fi

show_success "Dossiers trouvés : $SCRIPT_DIR"

# Étape 1
show_step "Étape 1/8 : Mise à jour du système"
echo "⏳ Cela peut prendre 1-2 minutes..."
sudo apt update
if [ $? -eq 0 ]; then
    show_success "Système à jour"
else
    show_warning "Mise à jour avec avertissements (on continue)"
fi

# Étape 2
show_step "Étape 2/8 : Installation Python"
sudo apt install -y python3 python3-pip python3-venv python3-dev build-essential
if [ $? -eq 0 ]; then
    show_success "Python installé"
else
    show_error "Erreur critique Python"
    read -p "Appuyez sur Entrée pour fermer"
    exit 1
fi

# Étape 3
show_step "Étape 3/8 : Installation Git et outils"
sudo apt install -y git curl wget
show_success "Git et outils installés"

# Étape 4
show_step "Étape 4/8 : Installation Node.js et Yarn"
echo "📦 Installation Node.js..."

# Vérifier si Node.js est déjà installé
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 16 ]; then
        show_success "Node.js $NODE_VERSION déjà installé"
    else
        show_warning "Node.js trop ancien, mise à jour..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt install -y nodejs
    fi
else
    # Installer Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Installer Yarn
echo "📦 Installation Yarn..."
sudo npm install -g yarn 2>&1 | grep -v "npm WARN" || true
show_success "Node.js et Yarn installés"

# Étape 5
show_step "Étape 5/8 : Installation MongoDB"
echo "📦 Installation MongoDB..."

# Vérifier si MongoDB est déjà installé
if command -v mongod &> /dev/null; then
    show_success "MongoDB déjà installé"
else
    sudo apt install -y mongodb 2>&1 | head -10
    if [ $? -eq 0 ]; then
        sudo systemctl start mongodb
        sudo systemctl enable mongodb
        show_success "MongoDB installé et démarré"
    else
        # Essayer avec mongodb-server si mongodb n'existe pas
        sudo apt install -y mongodb-server 2>&1 | head -10
        if [ $? -eq 0 ]; then
            sudo systemctl start mongodb
            sudo systemctl enable mongodb
            show_success "MongoDB installé"
        else
            show_warning "MongoDB non installé - Mode SIMULATION sera utilisé"
            echo "💡 L'application fonctionnera quand même en mode test"
        fi
    fi
fi

# Étape 6
show_step "Étape 6/8 : Configuration accès ports série (onduleurs)"
sudo apt install -y python3-serial
sudo usermod -a -G dialout $USER
sudo usermod -a -G tty $USER
show_success "Permissions configurées"
echo "⚠️  Vous devrez vous déconnecter/reconnecter pour que cela prenne effet"

# Étape 7
show_step "Étape 7/8 : Configuration Backend Python"
echo "⏳ Installation bibliothèques (2-3 minutes)..."
cd "$SCRIPT_DIR/backend"

python3 -m venv venv
if [ $? -ne 0 ]; then
    show_error "Erreur création environnement Python"
    read -p "Appuyez sur Entrée pour fermer"
    exit 1
fi

source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt 2>&1 | grep -E "(Successfully|error)" || echo "Installation en cours..."

if [ $? -eq 0 ]; then
    show_success "Backend Python configuré"
else
    show_error "Erreur installation bibliothèques Python"
    read -p "Appuyez sur Entrée pour fermer"
    exit 1
fi

# Créer .env
if [ ! -f .env ]; then
    cat > .env << 'EOF'
MONGO_URL="mongodb://localhost:27017"
DB_NAME="solar_monitor"
CORS_ORIGINS="*"
INVERTER_MODE="SIMULATION"
EOF
    show_success "Configuration backend créée"
fi

deactivate

# Étape 8
show_step "Étape 8/8 : Configuration Frontend React"
echo "⏳ Installation packages JavaScript (3-5 minutes sur Ubuntu)..."
echo "☕ Plus rapide que sur Raspberry Pi !"
cd "$SCRIPT_DIR/frontend"

yarn install 2>&1 | grep -E "(success|warning|error)" || echo "Installation en cours..."

if [ $? -eq 0 ]; then
    show_success "Frontend React configuré"
else
    show_error "Erreur installation frontend"
    read -p "Appuyez sur Entrée pour fermer"
    exit 1
fi

# Créer .env
if [ ! -f .env ]; then
    echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
    show_success "Configuration frontend créée"
fi

# Scripts de démarrage
cd "$SCRIPT_DIR"

cat > start_app.sh << 'EOFSTART'
#!/bin/bash
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          🌞 DÉMARRAGE SOLAR MONITOR                      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Backend
cd backend
source venv/bin/activate
echo "✅ Démarrage Backend (http://localhost:8001)..."
uvicorn server:app --host 0.0.0.0 --port 8001 > /tmp/solar-backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/solar-backend.pid

sleep 3

# Frontend
cd ../frontend
echo "✅ Démarrage Frontend (http://localhost:3000)..."
echo "⏳ Première compilation : 30-60 secondes..."
BROWSER=none yarn start > /tmp/solar-frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > /tmp/solar-frontend.pid

sleep 5

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          ✅ SOLAR MONITOR DÉMARRÉ !                      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Ouvrez votre navigateur :"
echo "   👉 http://localhost:3000"
echo ""
IP=$(hostname -I | awk '{print $1}')
echo "📱 Depuis un autre appareil (même réseau) :"
echo "   👉 http://$IP:3000"
echo ""
echo "🛑 Pour arrêter : ./stop_app.sh"
echo ""
echo "📊 Logs en temps réel :"
echo "   Backend : tail -f /tmp/solar-backend.log"
echo "   Frontend : tail -f /tmp/solar-frontend.log"
echo ""

# Ouvrir automatiquement le navigateur après 10 secondes
sleep 10
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000 2>/dev/null &
fi

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

echo "✅ Solar Monitor arrêté"
EOFSTOP

chmod +x start_app.sh stop_app.sh

# FIN
clear
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║          ✅✅✅ INSTALLATION RÉUSSIE ! ✅✅✅            ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}🎉 Solar Monitor est installé sur Ubuntu !${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 PROCHAINES ÉTAPES :"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  Déconnectez-vous et reconnectez-vous (pour permissions)"
echo "    OU redémarrez avec : sudo reboot"
echo ""
echo "2️⃣  Lancez l'application :"
echo "    cd $(pwd)"
echo "    ./start_app.sh"
echo ""
echo "3️⃣  Le navigateur s'ouvrira automatiquement sur :"
echo "    http://localhost:3000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 ASTUCE : Sur Ubuntu, l'application sera BEAUCOUP plus rapide !"
echo ""
read -p "Déconnexion/reconnexion maintenant ? (o pour oui, n pour plus tard) : " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Oo]$ ]]; then
    echo "👋 Déconnexion..."
    sleep 2
    gnome-session-quit --logout --no-prompt 2>/dev/null || pkill -KILL -u $USER
else
    echo ""
    echo "✅ N'oubliez pas de vous déconnecter/reconnecter plus tard !"
    echo "   Ou tapez : sudo reboot"
    echo ""
fi

echo ""
read -p "Appuyez sur Entrée pour fermer cette fenêtre..."
