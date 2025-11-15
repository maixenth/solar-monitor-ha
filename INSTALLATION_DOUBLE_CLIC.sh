#!/bin/bash

# Ce script est conçu pour être lancé en DOUBLE-CLIC
# Il ouvre un terminal qui reste ouvert

# Si lancé directement, ouvrir dans un terminal
if [ "$TERM" = "dumb" ] || [ -z "$TERM" ]; then
    lxterminal -e "bash '$0'; read -p 'Appuyez sur Entrée pour fermer'"
    exit 0
fi

clear
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     🌞 SOLAR MONITOR - INSTALLATION AUTOMATIQUE          ║"
echo "║         (Version Double-Clic - Sans Blocage)             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Cette fenêtre va rester ouverte pendant toute l'installation"
echo ""
sleep 2

# Trouver où on est
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📁 Dossier d'installation : $SCRIPT_DIR"
echo ""

# Vérifier qu'on a les bons dossiers
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ ERREUR : Dossiers backend/frontend introuvables !"
    echo ""
    echo "Ce script doit être dans le dossier solar-monitor"
    echo "avec les dossiers backend/ et frontend/"
    echo ""
    read -p "Appuyez sur Entrée pour fermer"
    exit 1
fi

echo "✅ Dossiers trouvés !"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "L'installation va commencer. Cela prend 10-15 minutes."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Appuyez sur Entrée pour continuer..."

# Fonction pour ne pas bloquer sur les erreurs
continue_on_error() {
    if [ $? -ne 0 ]; then
        echo "⚠️  Erreur détectée mais on continue..."
        return 1
    fi
    return 0
}

# Étape 1
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 Étape 1/7 : Mise à jour du système"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏳ Patience, cela peut prendre 1-2 minutes..."
echo ""
sudo apt update
continue_on_error
echo "✅ Étape 1 terminée"
sleep 1

# Étape 2
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 Étape 2/7 : Installation Python"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
sudo apt install -y python3 python3-pip python3-venv python3-dev gcc
if [ $? -ne 0 ]; then
    echo "❌ Erreur critique Python - Installation arrêtée"
    read -p "Appuyez sur Entrée pour fermer"
    exit 1
fi
echo "✅ Étape 2 terminée"
sleep 1

# Étape 3
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 Étape 3/7 : Installation Git et outils"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
sudo apt install -y git python3-serial wireless-tools net-tools
continue_on_error
echo "✅ Étape 3 terminée"
sleep 1

# Étape 4
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 Étape 4/7 : Installation Node.js et Yarn"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
sudo apt install -y nodejs npm
if [ $? -eq 0 ]; then
    echo "📦 Installation Yarn..."
    sudo npm install -g yarn 2>&1 | grep -v "npm WARN"
    echo "✅ Étape 4 terminée"
else
    echo "❌ Erreur Node.js - Installation arrêtée"
    read -p "Appuyez sur Entrée pour fermer"
    exit 1
fi
sleep 1

# Étape 5
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 Étape 5/7 : Configuration accès onduleurs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
sudo usermod -a -G dialout $USER
sudo usermod -a -G tty $USER
echo "✅ Étape 5 terminée"
sleep 1

# Étape 5.5 - MongoDB (optionnel)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 Étape 5.5/7 : MongoDB (optionnel, peut échouer)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  Si cette étape échoue, ce n'est pas grave"
sudo apt install -y mongodb 2>&1 | head -10
if [ $? -eq 0 ]; then
    sudo systemctl start mongodb 2>/dev/null
    sudo systemctl enable mongodb 2>/dev/null
    echo "✅ MongoDB installé"
else
    echo "⚠️  MongoDB non installé - Mode SIMULATION sera utilisé"
fi
sleep 1

# Étape 6
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 Étape 6/7 : Configuration Backend Python"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏳ Cette étape prend 2-3 minutes..."
echo ""
cd "$SCRIPT_DIR/backend"

python3 -m venv venv
if [ $? -ne 0 ]; then
    echo "❌ Erreur création environnement Python"
    read -p "Appuyez sur Entrée pour fermer"
    exit 1
fi

source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "❌ Erreur installation bibliothèques Python"
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
fi

deactivate
echo "✅ Étape 6 terminée"
sleep 1

# Étape 7
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 Étape 7/7 : Configuration Frontend React"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏳ Cette étape prend 5-10 minutes (la plus longue)..."
echo "☕ Prenez un café, c'est normal que ça prenne du temps"
echo ""
cd "$SCRIPT_DIR/frontend"

yarn install
if [ $? -ne 0 ]; then
    echo "❌ Erreur installation frontend"
    read -p "Appuyez sur Entrée pour fermer"
    exit 1
fi

# Créer .env
if [ ! -f .env ]; then
    echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env
fi

echo "✅ Étape 7 terminée"
sleep 1

# Scripts de démarrage
cd "$SCRIPT_DIR"

cat > start_app.sh << 'EOFSTART'
#!/bin/bash
echo "🌞 Démarrage Solar Monitor..."
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 > /tmp/solar-backend.log 2>&1 &
echo $! > /tmp/solar-backend.pid
sleep 3
cd ../frontend
yarn start > /tmp/solar-frontend.log 2>&1 &
echo $! > /tmp/solar-frontend.pid
echo ""
echo "✅ Solar Monitor démarré !"
echo "🌐 Ouvrez : http://localhost:3000"
echo ""
wait
EOFSTART

cat > stop_app.sh << 'EOFSTOP'
#!/bin/bash
[ -f /tmp/solar-backend.pid ] && kill $(cat /tmp/solar-backend.pid) 2>/dev/null
[ -f /tmp/solar-frontend.pid ] && kill $(cat /tmp/solar-frontend.pid) 2>/dev/null
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
echo "🎉 Solar Monitor est installé sur votre Raspberry Pi !"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 ÉTAPES SUIVANTES :"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  REDÉMARREZ le Raspberry Pi (pour les permissions) :"
echo "    sudo reboot"
echo ""
echo "2️⃣  Après redémarrage, DOUBLE-CLIQUEZ sur :"
echo "    start_app.sh"
echo ""
echo "3️⃣  Ouvrez le navigateur et allez sur :"
echo "    http://localhost:3000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Voulez-vous redémarrer MAINTENANT ?"
read -p "(o = oui, n = non) : " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Oo]$ ]]; then
    echo "🔄 Redémarrage dans 3 secondes..."
    sleep 3
    sudo reboot
else
    echo ""
    echo "✅ N'oubliez pas de redémarrer plus tard avec : sudo reboot"
    echo ""
fi

echo ""
read -p "Appuyez sur Entrée pour fermer cette fenêtre"
