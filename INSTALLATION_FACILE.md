# 🌞 Installation FACILE sur Raspberry Pi (Sans Commandes Compliquées)

## Guide pour Débutants - Pas à Pas

> **📌 Objectif** : Installer Solar Monitor sur votre Raspberry Pi sans être expert en informatique

---

## 🎯 Ce dont vous avez besoin

### Matériel
- ✅ Raspberry Pi (3, 4 ou 5) avec carte SD
- ✅ Clavier et souris USB
- ✅ Écran HDMI
- ✅ Câble Ethernet ou WiFi configuré
- ✅ Votre onduleur GROWATT ou MPPSOLAR
- ✅ Câble USB pour connecter l'onduleur au Raspberry Pi

### Logiciel
- ✅ Raspberry Pi OS déjà installé sur la carte SD
  - *Si pas encore fait : utilisez [Raspberry Pi Imager](https://www.raspberrypi.com/software/) sur votre ordinateur*

---

## 📥 Méthode 1 : Installation AUTOMATIQUE (Recommandée)

### Étape 1 : Télécharger le Script d'Installation

1. **Allumez votre Raspberry Pi** et attendez que le bureau s'affiche
2. **Ouvrez le navigateur web** (icône globe terrestre en haut)
3. **Téléchargez les fichiers** de l'application
   - Si vous avez reçu un fichier ZIP, enregistrez-le sur le Bureau
   - Sinon, demandez où obtenir les fichiers

### Étape 2 : Extraire les Fichiers

1. **Double-cliquez** sur le fichier ZIP téléchargé
2. Cliquez sur **"Extract"** (Extraire)
3. Choisissez le **Bureau** comme destination
4. Un dossier `solar-monitor` apparaît sur votre Bureau

### Étape 3 : Lancer l'Installation Automatique

1. **Ouvrez le gestionnaire de fichiers** (icône dossier en haut)
2. Allez dans le dossier `solar-monitor` sur le Bureau
3. **Double-cliquez** sur le fichier `INSTALLER_FACILE.sh`
4. Choisissez **"Execute"** (Exécuter)
5. **Entrez votre mot de passe** quand demandé
6. ☕ **Attendez 10-15 minutes** - L'installation se fait automatiquement
7. ✅ Message "Installation terminée !" apparaît

### Étape 4 : Vérifier que ça Fonctionne

1. **Ouvrez le navigateur web**
2. Tapez dans la barre d'adresse : `http://localhost:3000`
3. Appuyez sur **Entrée**
4. ✅ L'application Solar Monitor devrait s'afficher !

---

## 🖥️ Méthode 2 : Installation avec Interface Graphique (Alternative)

### Si le script automatique ne fonctionne pas...

#### A. Installer les Logiciels Nécessaires

1. **Menu Raspberry Pi** (en haut à gauche) → **Préférences** → **Add/Remove Software**
2. Dans la barre de recherche, tapez : `python3`
3. Cochez les cases :
   - ☑️ Python 3
   - ☑️ Python 3 pip
4. Cliquez sur **Apply** (Appliquer)
5. Recommencez pour : `mongodb`, `nodejs`, `git`

#### B. Ouvrir le Terminal (Juste une Fois)

1. **Menu** → **Accessoires** → **Terminal** (fenêtre noire)
2. **Copiez-collez** cette commande magique (tout se fera automatiquement) :

```bash
curl -o installer.sh https://raw.githubusercontent.com/VOTRE_REPO/main/installer.sh && bash installer.sh
```

3. Appuyez sur **Entrée**
4. Entrez votre **mot de passe** si demandé
5. ☕ Attendez la fin de l'installation

---

## 🔌 Connecter Votre Onduleur

### Étape 1 : Brancher l'Onduleur

1. **Éteignez** le Raspberry Pi
2. **Connectez le câble USB** de votre onduleur au Raspberry Pi
   - Pour GROWATT : Utilisez un câble USB-RS485
   - Pour MPPSOLAR : Câble USB direct
3. **Rallumez** le Raspberry Pi

### Étape 2 : Vérifier la Connexion

1. Ouvrez l'application Solar Monitor dans le navigateur : `http://localhost:3000`
2. Cliquez sur **"Onduleurs"** dans le menu de gauche
3. Cliquez sur le bouton vert **"Scanner automatiquement"**
4. ✅ Votre onduleur devrait être détecté automatiquement !

### Si l'onduleur n'est PAS détecté :

1. Dans Solar Monitor, allez dans **"Paramètres"**
2. En haut, cliquez sur **"Mode REAL"** (au lieu de SIMULATION)
3. Retournez dans **"Onduleurs"**
4. Cliquez à nouveau sur **"Scanner automatiquement"**

---

## 🌐 Accéder depuis un Autre Appareil (Téléphone, PC)

### Trouver l'Adresse de votre Raspberry Pi

**Méthode Simple :**

1. Dans Solar Monitor, allez dans **"Paramètres"**
2. Regardez la section **"Réseau Local"**
3. Notez l'adresse IP affichée (ex: `192.168.1.50`)

**Sur votre téléphone ou ordinateur :**

1. Connectez-vous au **même WiFi** que le Raspberry Pi
2. Ouvrez le navigateur web
3. Tapez l'adresse : `http://192.168.1.50:3000` (remplacez par VOTRE IP)
4. ✅ L'application s'affiche !

---

## 🔄 Démarrage Automatique au Lancement

Pour que l'application démarre automatiquement quand vous allumez le Raspberry Pi :

### Méthode Graphique (Plus Simple)

1. **Menu** → **Préférences** → **Raspberry Pi Configuration**
2. Onglet **"System"**
3. Section **"Auto Login"** : Activez
4. Section **"Boot"** : Choisissez **"To Desktop"**
5. Cliquez sur **OK**

6. **Menu** → **Préférences** → **Session and Startup**
7. Onglet **"Application Autostart"**
8. Cliquez sur **"Add"** (Ajouter)
9. Remplissez :
   - Nom : `Solar Monitor`
   - Description : `Application monitoring solaire`
   - Commande : Collez ceci (tout sur une ligne) :
     ```
     lxterminal -e "bash -c 'cd /home/pi/solar-monitor && ./start_app.sh'"
     ```
10. Cliquez sur **OK**
11. **Redémarrez** le Raspberry Pi

✅ L'application démarre maintenant automatiquement !

---

## ❓ Problèmes Fréquents et Solutions

### 🔴 L'application ne s'ouvre pas

**Solution :**
1. Attendez 30 secondes après le démarrage du Raspberry Pi
2. Réessayez d'ouvrir `http://localhost:3000`
3. Si ça ne fonctionne toujours pas :
   - Menu → Accessoires → Terminal
   - Tapez : `cd solar-monitor && ./restart_app.sh`
   - Appuyez sur Entrée

### 🔴 L'onduleur n'est pas détecté

**Solution :**
1. Vérifiez que le câble USB est bien branché
2. Dans Solar Monitor → Paramètres
3. Vérifiez que **"Mode REAL"** est activé (pas SIMULATION)
4. Dans Onduleurs → Cliquez sur "Scanner automatiquement"
5. Attendez 10 secondes

### 🔴 "Permission denied" ou erreur de permission

**Solution Rapide :**
1. Menu → Accessoires → Terminal
2. Copiez-collez cette ligne :
   ```bash
   sudo usermod -a -G dialout $USER && sudo reboot
   ```
3. Appuyez sur Entrée
4. Le Raspberry Pi redémarre automatiquement

### 🔴 L'application affiche des données mais elles sont aléatoires

**C'est normal !** Vous êtes en mode SIMULATION (test)

**Pour passer en mode RÉEL :**
1. Solar Monitor → **Paramètres**
2. Section **"Mode de Fonctionnement"**
3. Cliquez sur le bouton **"Mode REAL"**
4. ✅ L'application lit maintenant les vraies données de votre onduleur

---

## 🆘 Besoin d'Aide ?

### Option 1 : Réinitialisation Complète
Si rien ne fonctionne, vous pouvez tout recommencer :

1. Menu → Accessoires → Terminal
2. Tapez : `cd ~ && rm -rf solar-monitor`
3. Recommencez l'installation depuis le début

### Option 2 : Demander de l'Aide
Gardez ces informations à portée de main :
- Modèle de Raspberry Pi : ___________
- Marque d'onduleur : ___________
- Message d'erreur (si affiché) : ___________

---

## 🎉 Félicitations !

Votre système de monitoring solaire est maintenant opérationnel !

### Fonctionnalités Disponibles :

✅ **Dashboard** : Voir le flux d'énergie en temps réel
✅ **Graphiques** : Analyser votre production sur la journée/semaine/mois
✅ **Statistiques** : Suivre vos économies et performances
✅ **Onduleurs** : Gérer vos onduleurs connectés
✅ **Paramètres** : Configurer votre système

### Prochaines Étapes :

1. 📱 Configurez l'accès depuis votre téléphone (voir section "Accéder depuis un autre appareil")
2. 🔐 Configurez un accès depuis Internet si vous voulez surveiller à distance (optionnel)
3. ⚙️ Personnalisez les règles de gestion énergétique selon vos besoins

---

## 📚 Pour Aller Plus Loin

Si vous devenez plus à l'aise avec le Raspberry Pi :
- 📖 Consultez le guide technique : `RASPBERRY_PI_SETUP.md`
- 🔧 Personnalisez les paramètres avancés dans les fichiers `.env`
- 🌐 Configurez un accès distant sécurisé avec VPN

---

**🌞 Profitez de votre énergie solaire avec Solar Monitor ! 🌞**
