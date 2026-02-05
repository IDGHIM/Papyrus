# Papyrus - Plateforme de Partage de Cours PDF

Une application web complète permettant aux utilisateurs de télécharger, partager et gérer des cours au format PDF avec un système d'authentification multi-utilisateurs.

## 🚀 Fonctionnalités

### Authentification
- ✅ Inscription et connexion sécurisée
- ✅ Authentification JWT
- ✅ Hachage des mots de passe avec bcrypt
- ✅ Sessions persistantes

### Gestion des Cours
- 📤 Upload de fichiers PDF (max 10 MB)
- 📚 Bibliothèque personnelle de cours
- 🔍 Recherche en temps réel
- 👁️ Visualisation PDF intégrée
- 📥 Téléchargement de cours
- 🗑️ Suppression de cours (propriétaire uniquement)

### Partage
- 🌐 Partage public/privé
- 📊 Statistiques (vues, téléchargements)
- 👥 Accès multi-utilisateurs aux cours publics
- 🔒 Protection des cours privés

## 🛠️ Technologies Utilisées

### Backend
- **Node.js** + **Express.js** - Serveur API REST
- **MongoDB** + **Mongoose** - Base de données
- **JWT** - Authentification
- **Bcrypt** - Sécurité des mots de passe
- **Multer** - Upload de fichiers

### Frontend
- **React** - Interface utilisateur
- **Tailwind CSS** - Styling
- **Lucide React** - Icônes
- **Fetch API** - Communication avec le backend

## 📦 Installation

### Prérequis
- Node.js (v14 ou supérieur)
- MongoDB (local ou Atlas)
- npm ou yarn

### 1️⃣ Cloner le Projet

```bash
git clone <votre-repo>
cd course-share
```

### 2️⃣ Configuration du Backend

```bash
cd backend
npm install
```

Créez un fichier `.env` à la racine du dossier backend :

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/course-share
JWT_SECRET=votre-clé-secrète-super-sécurisée-à-changer
NODE_ENV=development
```

⚠️ **Important** : Changez le `JWT_SECRET` en production !

### 3️⃣ Configuration du Frontend

```bash
cd frontend
npm install
```

Si nécessaire, ajustez l'URL de l'API dans `src/App.jsx` :

```javascript
const API_URL = 'http://localhost:5000/api';
```

## 🚀 Démarrage

### Lancer MongoDB

Si MongoDB est installé localement :

```bash
mongod
```

Ou utilisez MongoDB Atlas pour une base de données cloud.

### Démarrer le Backend

```bash
cd backend
npm run dev
```

Le serveur démarre sur `http://localhost:5000`

### Démarrer le Frontend

Dans un nouveau terminal :

```bash
cd frontend
npm run dev
```

L'application React démarre sur `http://localhost:5173` (ou le port indiqué)

## 📖 Utilisation

### 1. Inscription/Connexion
- Créez un compte avec un nom d'utilisateur, email et mot de passe
- Ou connectez-vous avec vos identifiants existants

### 2. Ajouter un Cours
- Cliquez sur la zone d'upload
- Sélectionnez un fichier PDF (max 10 MB)
- Le cours est ajouté automatiquement

### 3. Gérer vos Cours
- **Voir** : Prévisualisez le PDF dans un viewer intégré
- **Partager** : Basculez entre Public/Privé
- **Télécharger** : Récupérez le fichier original
- **Supprimer** : Retirez définitivement le cours (propriétaire uniquement)

### 4. Rechercher
- Utilisez la barre de recherche pour filtrer par titre ou description

### 5. Accéder aux Cours Partagés
- Tous les cours publics sont visibles par tous les utilisateurs
- Les cours privés ne sont visibles que par leur propriétaire

## 🗂️ Structure du Projet

```
papyrus/
├── backend/
│   ├── server.js           # Point d'entrée du serveur
│   ├── package.json        # Dépendances backend
│   ├── .env.example        # Variables d'environnement exemple
│   └── uploads/            # Dossier de stockage des PDF (créé auto)
│
└── frontend/
    ├── src/
    │   └── App.jsx         # Application React principale
    ├── package.json        # Dépendances frontend
    └── index.html          # Page HTML de base
```

## 🔐 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion

### Cours
- `GET /api/courses` - Liste des cours accessibles
- `POST /api/courses` - Upload d'un nouveau cours
- `GET /api/courses/:id` - Détails d'un cours
- `PATCH /api/courses/:id` - Modifier un cours
- `DELETE /api/courses/:id` - Supprimer un cours
- `GET /api/courses/:id/download` - Télécharger un cours

### Santé
- `GET /api/health` - Vérifier l'état du serveur

## 🔒 Sécurité

- ✅ Mots de passe hachés avec bcrypt (10 rounds)
- ✅ Tokens JWT avec expiration (7 jours)
- ✅ Validation des types de fichiers (PDF uniquement)
- ✅ Limitation de taille des fichiers (10 MB)
- ✅ Protection des routes avec middleware d'authentification
- ✅ Vérification des permissions propriétaire

## 🎨 Personnalisation

### Modifier le Design
Le frontend utilise Tailwind CSS avec un thème personnalisé :
- Gradient principal : Purple → Pink
- Effets de blob animés pour l'authentification
- Animations de hover sur les cartes

### Ajuster les Limites
Dans `backend/server.js` :

```javascript
limits: {
  fileSize: 4 * 1024 * 1024 // 4 Mo
}
```

### Changer la Durée des Tokens
Dans `backend/server.js` :

```javascript
jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }) // Modifier ici
```

## 🐛 Résolution de Problèmes

### Le serveur ne démarre pas
- Vérifiez que MongoDB est en cours d'exécution
- Vérifiez que le port 5000 n'est pas déjà utilisé

### Erreur CORS
- Assurez-vous que le backend autorise l'origine du frontend
- Vérifiez la configuration CORS dans `server.js`

### Les fichiers ne s'uploadent pas
- Vérifiez les permissions du dossier `uploads/`
- Vérifiez la taille du fichier (< 10 MB)
- Vérifiez que le fichier est bien un PDF

### Token invalide
- Supprimez le localStorage et reconnectez-vous
- Vérifiez que le `JWT_SECRET` est identique entre les requêtes

## 📝 TODO / Améliorations Futures

- [ ] Partage avec des utilisateurs spécifiques
- [ ] Catégories et tags pour les cours
- [ ] Commentaires et évaluations
- [ ] Notifications en temps réel
- [ ] Upload multiple de fichiers
- [ ] Prévisualisation thumbnail des PDF
- [ ] Pagination pour grandes bibliothèques
- [ ] Export/Import de cours
- [ ] Thème sombre
- [ ] Support multi-langues

## 📄 Licence

Ce projet est sous licence MIT.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
1. Fork le projet
2. Créer une branche pour votre feature
3. Commit vos changements
4. Push vers la branche
5. Ouvrir une Pull Request

## 👨‍💻 Auteur

Créé avec ❤️ pour faciliter le partage de connaissances

---

**Bon partage de cours ! 📚✨**
