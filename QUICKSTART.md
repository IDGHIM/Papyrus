# 🚀 Guide de Démarrage Rapide - Papyrus

## Installation Express (5 minutes)

### 1. Installer MongoDB
**Option A - MongoDB Local :**
```bash
# macOS
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongodb

# Windows
# Téléchargez depuis https://www.mongodb.com/try/download/community
```

**Option B - MongoDB Atlas (Cloud - Gratuit) :**
1. Créez un compte sur https://www.mongodb.com/cloud/atlas
2. Créez un cluster gratuit
3. Copiez votre URI de connexion
4. Utilisez cet URI dans le fichier `.env`

### 2. Installation du Backend

```bash
cd backend
npm install
```

Créez un fichier `.env` :
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/course-share
JWT_SECRET=changez-moi-en-production-utilisez-une-longue-chaine-aleatoire
NODE_ENV=development
```

Démarrez le serveur :
```bash
npm run dev
```

✅ Le backend tourne sur http://localhost:5000

### 3. Installation du Frontend

Nouvelle fenêtre de terminal :

```bash
cd frontend
npm install
npm run dev
```

✅ Le frontend tourne sur http://localhost:3000

### 4. Première Utilisation

1. Ouvrez http://localhost:3000
2. Créez un compte (inscription)
3. Uploadez votre premier PDF !

## 🎯 Commandes Utiles

### Backend
```bash
npm run dev    # Mode développement avec auto-reload
npm start      # Mode production
```

### Frontend
```bash
npm run dev      # Serveur de développement
npm run build    # Build de production
npm run preview  # Prévisualiser le build
```

## ⚠️ Dépannage Rapide

**Erreur MongoDB :**
```bash
# Vérifiez que MongoDB est démarré
# macOS
brew services list | grep mongodb

# Linux
sudo systemctl status mongodb
```

**Port déjà utilisé :**
```bash
# Changez le port dans backend/.env ou frontend/vite.config.js
```

**CORS Error :**
- Vérifiez que le backend tourne sur le port 5000
- Vérifiez l'URL API dans frontend/src/App.jsx

## 📁 Structure Simplifiée

```
course-share/
├── backend/          # Serveur Node.js + MongoDB
│   ├── server.js     # API REST
│   ├── .env          # Configuration (à créer)
│   └── uploads/      # PDFs (créé auto)
│
└── frontend/         # Application React
    └── src/
        └── App.jsx   # Interface utilisateur
```

## 🔑 Fonctionnalités Clés

✅ Authentification sécurisée (JWT + bcrypt)
✅ Upload de PDF jusqu'à 10 MB
✅ Partage public/privé
✅ Visualisation PDF intégrée
✅ Recherche en temps réel
✅ Statistiques (vues, téléchargements)
✅ Interface moderne et responsive

## 📚 Prochaines Étapes

1. Lisez le README.md complet pour plus de détails
2. Personnalisez le design dans App.jsx
3. Ajoutez des fonctionnalités (voir TODO dans README.md)
4. Déployez sur Heroku, Vercel, ou Railway

**Besoin d'aide ?** Consultez le README.md principal !
