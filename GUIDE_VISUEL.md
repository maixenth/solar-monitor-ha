# 🌞 Guide Visuel - Installation Solar Monitor

## Guide avec Images pour Raspberry Pi (Débutants)

---

## 📦 Étape 1 : Préparer votre Raspberry Pi

### Ce qu'il vous faut :

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   📟 Raspberry Pi (3, 4 ou 5)                          │
│   💾 Carte SD avec Raspberry Pi OS                     │
│   ⌨️  Clavier USB                                       │
│   🖱️  Souris USB                                        │
│   🖥️  Écran HDMI                                        │
│   🔌 Câble USB pour onduleur                           │
│   🌐 Connexion Internet (WiFi ou Ethernet)             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Allumer votre Raspberry Pi :

1. Branchez l'écran HDMI
2. Branchez clavier et souris
3. Branchez l'alimentation
4. Attendez que le bureau s'affiche (environ 30 secondes)

**Vous devriez voir :**
```
┌────────────────────────────────────────────────┐
│  🍓 Raspberry Pi OS                            │
│  ┌──────────────────────────────────────┐     │
│  │ [🏠] [📁] [🌐] [⚙️]                  │     │
│  └──────────────────────────────────────┘     │
│                                                │
│  📁 Documents    📁 Downloads                  │
│  📁 Pictures     📁 Videos                     │
│                                                │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 💾 Étape 2 : Télécharger Solar Monitor

### Option A : Via USB depuis un ordinateur

1. **Sur votre ordinateur** :
   - Téléchargez le dossier `solar-monitor.zip`
   - Copiez-le sur une clé USB

2. **Sur le Raspberry Pi** :
   - Branchez la clé USB
   - Double-cliquez sur l'icône USB sur le bureau
   - Faites glisser `solar-monitor.zip` sur le **Bureau**
   - Double-cliquez sur le fichier ZIP
   - Cliquez sur **Extract** → **Bureau**

### Option B : Via Internet (si vous avez les fichiers en ligne)

1. Ouvrez le **navigateur web** (icône 🌐 en haut)
2. Téléchargez le fichier `solar-monitor.zip`
3. Cliquez sur le fichier téléchargé pour l'ouvrir
4. Cliquez sur **Extract** → **Bureau**

**Résultat attendu :**
```
Bureau du Raspberry Pi:
┌─────────────────────┐
│ 📁 solar-monitor    │  ← Ce dossier doit apparaître
│    ├── backend/     │
│    ├── frontend/    │
│    └── INSTALLER... │
└─────────────────────┘
```

---

## 🚀 Étape 3 : Lancer l'Installation Automatique

### Méthode 1 : Double-Clic (Plus Simple)

1. **Double-cliquez** sur le dossier `solar-monitor` sur votre Bureau
2. Cherchez le fichier appelé `INSTALLER_FACILE.sh`
3. **Faites un clic-droit** dessus
4. Choisissez **"Execute"** ou **"Exécuter"**

**Une fenêtre noire s'ouvre avec :**
```
╔═══════════════════════════════════════════════════╗
║                                                   ║
║     🌞 SOLAR MONITOR - INSTALLATION FACILE       ║
║                                                   ║
╚═══════════════════════════════════════════════════╝

📋 Ce script va installer automatiquement...
⏱️  Durée estimée : 10-15 minutes

Appuyez sur Entrée pour commencer...
```

5. **Appuyez sur Entrée**
6. Si demandé, **tapez votre mot de passe** et appuyez sur Entrée
   - ⚠️ Le mot de passe ne s'affiche pas quand vous tapez (c'est normal)

### Méthode 2 : Via Terminal (Alternative)

Si le double-clic ne fonctionne pas :

1. **Menu Raspberry Pi** (en haut à gauche) → **Accessoires** → **Terminal**
2. Une fenêtre noire s'ouvre
3. **Copiez-collez** ces 2 lignes (une par une) :

```bash
cd ~/Desktop/solar-monitor
bash INSTALLER_FACILE.sh
```

4. Appuyez sur **Entrée** après chaque ligne

---

## ⏳ Étape 4 : Attendre l'Installation

### Que va-t-il se passer ?

L'installation automatique va :

```
📦 Étape 1/8 : Mise à jour du système          [████████████] ✅
📦 Étape 2/8 : Installation logiciels          [████████████] ✅
📦 Étape 3/8 : Installation Yarn               [████████████] ✅
📦 Étape 4/8 : Configuration accès onduleurs   [████████████] ✅
📦 Étape 5/8 : Démarrage base de données       [████████████] ✅
📦 Étape 6/8 : Configuration Backend           [████████████] ✅
📦 Étape 7/8 : Configuration Frontend          [████████████] ✅
📦 Étape 8/8 : Scripts de démarrage            [████████████] ✅
```

**⏱️ Temps d'attente : 10-15 minutes**  
☕ Allez vous faire un café !

### À la fin, vous verrez :

```
╔═══════════════════════════════════════════════════╗
║                                                   ║
║      ✅ INSTALLATION TERMINÉE AVEC SUCCÈS !      ║
║                                                   ║
╚═══════════════════════════════════════════════════╝

Voulez-vous redémarrer maintenant ? (o/n) :
```

**Tapez `o` et appuyez sur Entrée** pour redémarrer.

---

## 🎮 Étape 5 : Démarrer l'Application

### Après le redémarrage :

1. **Ouvrez le gestionnaire de fichiers** (icône 📁 en haut)
2. Allez dans **Bureau** → **solar-monitor**
3. **Double-cliquez** sur `start_app.sh`
4. Choisissez **Execute** (Exécuter)

**Une fenêtre s'ouvre avec :**
```
🌞 Démarrage de Solar Monitor...
✅ Backend démarré
✅ Frontend démarré

╔═══════════════════════════════════════════════════╗
║      🌞 SOLAR MONITOR EST MAINTENANT ACTIF       ║
╚═══════════════════════════════════════════════════╝

🌐 Ouvrez votre navigateur et allez sur :
   👉 http://localhost:3000
```

5. **Ouvrez le navigateur web** (icône 🌐)
6. Dans la barre d'adresse, tapez : `localhost:3000`
7. Appuyez sur **Entrée**

**✅ L'application Solar Monitor s'ouvre !**

---

## 🔌 Étape 6 : Connecter Votre Onduleur

### Branchement Physique :

#### Pour GROWATT :
```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│              │         │  Adaptateur  │         │              │
│   GROWATT    │◄───RS485│  USB-RS485   │◄───USB──│  Raspberry   │
│   Onduleur   │         │   (FTDI)     │         │      Pi      │
│              │         │              │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
```

#### Pour MPPSOLAR :
```
┌──────────────┐                                  ┌──────────────┐
│              │                                  │              │
│  MPPSOLAR    │◄──────────USB Direct─────────────│  Raspberry   │
│   Onduleur   │                                  │      Pi      │
│              │                                  │              │
└──────────────┘                                  └──────────────┘
```

### Dans l'Application :

1. Dans Solar Monitor, cliquez sur **"Onduleurs"** (dans le menu de gauche)
2. Vous verrez cette interface :

```
┌────────────────────────────────────────────────────────┐
│  Onduleurs en Temps Réel                               │
│  ┌──────────────────────┐  ┌────────────────────────┐ │
│  │ 🔍 Scanner           │  │ ➕ Ajouter             │ │
│  │    automatiquement   │  │    manuellement        │ │
│  └──────────────────────┘  └────────────────────────┘ │
│                                                        │
│  ❌ Aucun onduleur configuré                          │
│  Cliquez sur "Scanner" pour détecter                   │
└────────────────────────────────────────────────────────┘
```

3. Cliquez sur le bouton **"Scanner automatiquement"**
4. Attendez 5-10 secondes
5. **Votre onduleur devrait apparaître !**

```
┌────────────────────────────────────────────────────────┐
│  ✅ GROWATT Inverter (Auto-détecté)                    │
│  📊 Production: 3.2 kW  |  🔋 Batterie: 85%           │
│  📍 Port: /dev/ttyUSB0  |  🟢 Connecté               │
└────────────────────────────────────────────────────────┘
```

---

## ⚙️ Étape 7 : Passer en Mode RÉEL

### Par défaut, l'application est en mode TEST (simulation)

Pour lire les vraies données de votre onduleur :

1. Cliquez sur **"Paramètres"** (en bas du menu de gauche)
2. En haut de la page, vous verrez :

```
┌────────────────────────────────────────────────────────┐
│  Mode de Fonctionnement              [ SIMULATION ] ⚠️ │
│                                                        │
│  ⚠️ Mode TEST activé                                  │
│  L'application génère des données aléatoires          │
│                                                        │
│  ┌──────────────────┐    ┌──────────────────┐        │
│  │ Mode SIMULATION  │    │   Mode REAL ✓    │        │
│  │   (désactivé)    │    │    (Cliquer)     │        │
│  └──────────────────┘    └──────────────────┘        │
└────────────────────────────────────────────────────────┘
```

3. **Cliquez sur "Mode REAL"**
4. La carte devient verte :

```
┌────────────────────────────────────────────────────────┐
│  Mode de Fonctionnement                   [ REAL ] ✅  │
│                                                        │
│  ✅ Mode PRODUCTION activé                            │
│  L'application lit les vraies données                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

5. **Retournez sur le Dashboard** (premier menu)
6. Les données sont maintenant RÉELLES !

---

## 📱 Étape 8 : Accéder depuis votre Téléphone

### Trouver l'adresse IP :

1. Dans Solar Monitor → **Paramètres**
2. Section **"Réseau Local"** :

```
┌────────────────────────────────────────────────────────┐
│  Réseau Local                                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │ 🌐 eth0 (Ethernet)                               │ │
│  │ IP: 192.168.1.50        [Copier]                │ │
│  │ Masque: 255.255.255.0                            │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

3. **Notez l'adresse IP** (ex: `192.168.1.50`)

### Sur votre téléphone/tablette :

1. **Connectez-vous au même WiFi** que le Raspberry Pi
2. Ouvrez le navigateur (Safari, Chrome, etc.)
3. Tapez dans la barre d'adresse : `http://192.168.1.50:3000`
   - ⚠️ Remplacez par VOTRE adresse IP
4. Appuyez sur **Go/Entrée**
5. **L'application s'affiche sur votre téléphone !**

```
┌─────────────────────┐
│   📱 iPhone          │
│  ┌───────────────┐  │
│  │ 🌞 Dashboard  │  │
│  │               │  │
│  │  Solaire ⚡   │  │
│  │   3.2 kW      │  │
│  │               │  │
│  │  Batterie 🔋  │  │
│  │   85%         │  │
│  └───────────────┘  │
└─────────────────────┘
```

---

## 🛑 Arrêter l'Application

### Pour fermer Solar Monitor :

1. Allez dans le dossier `solar-monitor`
2. **Double-cliquez** sur `stop_app.sh`
3. Choisissez **Execute**
4. L'application s'arrête

**Ou simplement fermez la fenêtre noire du Terminal**

---

## 🔄 Redémarrer l'Application

### Si l'application plante ou ne répond plus :

1. Allez dans le dossier `solar-monitor`
2. **Double-cliquez** sur `restart_app.sh`
3. Attendez 10 secondes
4. Rouvrez le navigateur → `localhost:3000`

---

## ❓ Problèmes Fréquents (avec Solutions Simples)

### 🔴 "Impossible de se connecter" dans le navigateur

**Solution :**
1. Attendez 30 secondes après avoir lancé `start_app.sh`
2. Réessayez
3. Si ça ne marche toujours pas :
   - Fermez tout (clic droit sur fenêtre noire → Close)
   - Relancez `start_app.sh`

### 🔴 L'onduleur ne s'affiche pas

**Checklist :**
- ✅ Câble USB bien branché ?
- ✅ Mode REAL activé dans Paramètres ?
- ✅ Cliqué sur "Scanner automatiquement" ?
- ✅ Attendu 10 secondes ?

**Si toujours rien :**
1. Débranchez le câble USB
2. Rebranchez-le
3. Attendez 5 secondes
4. Rescannez

### 🔴 Données aléatoires au lieu des vraies

**C'est parce que vous êtes en mode SIMULATION**

**Solution :**
1. Paramètres
2. Cliquez sur "Mode REAL"
3. Retournez au Dashboard

### 🔴 Message "Permission denied"

**Solution :**
1. Menu → Accessoires → Terminal
2. Copiez-collez :
   ```bash
   sudo usermod -a -G dialout $USER
   ```
3. Appuyez sur Entrée
4. **Redémarrez le Raspberry Pi**

---

## 🎉 Félicitations !

Vous avez maintenant un système de monitoring solaire professionnel !

### Ce que vous pouvez faire :

✅ **Dashboard** : Voir votre production en temps réel  
✅ **Graphiques** : Analyser vos performances jour/semaine/mois  
✅ **Statistiques** : Calculer vos économies  
✅ **Accès mobile** : Surveiller depuis votre téléphone  

### Pour aller plus loin :

📚 **Documentation technique** : `RASPBERRY_PI_SETUP.md`  
🌐 **Accès Internet** : Configurez un accès depuis n'importe où (voir guide)  
⚙️ **Personnalisation** : Modifiez les paramètres selon vos besoins  

---

**🌞 Profitez de votre énergie solaire avec Solar Monitor ! 🌞**

*Si vous avez des questions, consultez `INSTALLATION_FACILE.md` pour plus de détails*
