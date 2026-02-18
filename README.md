# 📚 Papyrus

> Ta bibliothèque de connaissances — Partage et découvre des cours en PDF avec ta communauté.

![License](https://img.shields.io/badge/license-MIT-purple)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![React](https://img.shields.io/badge/React-18-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Local-brightgreen)

---

## ✨ Présentation

**Papyrus** est une application web fullstack permettant aux étudiants et enseignants de partager des cours en PDF. Elle offre une expérience moderne avec authentification sécurisée, partage par lien, système de favoris, commentaires et évaluations.

### Fonctionnalités principales

- 📤 **Upload de PDF** — Ajout de cours (max 10 Mo) avec titre et catégorie
- 🌍 **Découverte** — Exploration des cours publics, triables par popularité, téléchargements ou note
- 🔗 **Partage par lien** — Génération d'un lien unique permettant l'accès sans compte
- ❤️ **Favoris** — Sauvegarde de cours pour y accéder rapidement
- 💬 **Commentaires & évaluations** — Notes sur 5 étoiles et avis sur chaque cours
- 🔒 **Réinitialisation de mot de passe** — Flux complet par email avec lien expirant en 7 minutes
- 📊 **Statistiques** — Compteurs de vues et de téléchargements par cours

---

## 🛠️ Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18, Tailwind CSS, Lucide React |
| Backend | Node.js, Express |
| Base de données | MongoDB (Mongoose) |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Upload | Multer |
| Email | Nodemailer (SMTP) |

---

## 🚀 Installation

### Prérequis

- Node.js ≥ 18
- MongoDB (local ou Atlas)
- Un compte SMTP (ex : Gmail avec mot de passe d'application)

### 1. Cloner le dépôt

```bash
git clone https://github.com/ton-pseudo/papyrus.git
cd papyrus
```

### 2. Installer les dépendances

```bash
# Backend
npm install

# Frontend (dans le dossier client si séparé)
cd client && npm install
```

### 3. Configurer les variables d'environnement

Crée un fichier `.env` à la racine du backend :

```env
# Serveur
PORT=5000
CLIENT_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/course-share

# JWT
JWT_SECRET=change_moi_en_production

# SMTP (exemple Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=ton@email.com
EMAIL_PASS=ton_mot_de_passe_application
EMAIL_FROM="Papyrus 📚 <no-reply@papyrus.app>"
```

> **Gmail** : Active l'authentification à deux facteurs puis génère un [mot de passe d'application](https://myaccount.google.com/apppasswords).

### 4. Lancer l'application

```bash
# Backend
node server.js

# Frontend (dans un autre terminal)
npm run dev
```

L'API sera disponible sur `http://localhost:5000` et le frontend sur `http://localhost:3000`.

---

## 📁 Structure du projet

```
papyrus/
├── server.js            # Serveur Express + toutes les routes API
├── uploads/             # Fichiers PDF uploadés (créé automatiquement)
├── .env                 # Variables d'environnement (non versionné)
├── package.json
└── client/
    └── src/
        └── App.jsx      # Application React (composant principal)
```

---

## 🔌 API — Endpoints principaux

### Authentification

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Inscription |
| `POST` | `/api/auth/login` | Connexion |
| `POST` | `/api/auth/forgot-password` | Demande de réinitialisation |
| `GET` | `/api/auth/reset-password/:token` | Vérification du token |
| `POST` | `/api/auth/reset-password/:token` | Nouveau mot de passe |

### Cours

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/courses/my-courses` | Mes cours |
| `GET` | `/api/courses/public` | Cours publics |
| `POST` | `/api/courses` | Upload d'un cours |
| `PATCH` | `/api/courses/:id` | Modifier un cours |
| `DELETE` | `/api/courses/:id` | Supprimer un cours |
| `GET` | `/api/courses/:id/download` | Télécharger un PDF |
| `POST` | `/api/courses/:id/share-link` | Générer un lien de partage |
| `DELETE` | `/api/courses/:id/share-link` | Révoquer un lien |
| `GET` | `/api/courses/share/:token` | Accès public par lien |

### Favoris & Commentaires

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/favorites` | Mes favoris |
| `POST` | `/api/favorites/:courseId` | Ajouter un favori |
| `DELETE` | `/api/favorites/:courseId` | Retirer un favori |
| `GET` | `/api/courses/:id/comments` | Commentaires d'un cours |
| `POST` | `/api/courses/:id/comments` | Ajouter un commentaire |
| `DELETE` | `/api/comments/:commentId` | Supprimer un commentaire |

---

## 🗂️ Catégories disponibles

Mathématiques · Physique · Chimie · Informatique · Histoire · Géographie · Philosophie · Langues · Économie · Droit · Médecine · Biologie · Littérature · Arts · Sport · Autre

---

## 🔐 Sécurité

- Les mots de passe sont hashés avec **bcrypt** (salt rounds : 10)
- Les tokens JWT expirent après **7 jours**
- Les liens de réinitialisation de mot de passe expirent après **7 minutes**
- Les réponses de la route `forgot-password` sont génériques pour ne pas révéler si un email existe en base
- L'accès aux fichiers est contrôlé côté serveur avant chaque téléchargement

---

## 🌍 Déploiement

### Variables d'environnement à mettre à jour

```env
CLIENT_URL=https://ton-domaine.com
JWT_SECRET=une_chaine_tres_longue_et_aleatoire
MONGODB_URI=mongodb+srv://...
```

### Points d'attention

- Le dossier `uploads/` doit être persistant (volume Docker ou stockage objet type S3 en production)
- Configurer un proxy inverse (Nginx / Caddy) pour servir frontend et backend sur le même domaine
- Activer HTTPS pour que les cookies et liens de reset soient sécurisés

---

## 🤝 Contribuer

Les contributions sont les bienvenues !

1. Fork le dépôt
2. Crée une branche : `git checkout -b feature/ma-feature`
3. Commit tes changements : `git commit -m 'feat: ajout de ma feature'`
4. Push : `git push origin feature/ma-feature`
5. Ouvre une Pull Request

---

## 📄 Licence

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

<p align="center">Fait avec ❤️ par la communauté Papyrus 📚</p>