// server.js - Backend Node.js avec Express et MongoDB
require('dotenv').config();
console.log('🔍 Test .env - MONGODB_URI:', process.env.MONGODB_URI ? '✅ Trouvé' : '❌ Non trouvé');
console.log('🔍 URI complète:', process.env.MONGODB_URI);

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));

// Création du dossier uploads s'il n'existe pas
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Configuration Multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont autorisés'));
    }
  },
  limits: {
    fileSize: 4 * 1024 * 1024 // 4 Mo
  }
});

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-share', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connecté'))
.catch(err => console.error('❌ Erreur MongoDB:', err));

// Schémas MongoDB
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shared: { type: Boolean, default: false },
  shareToken: { type: String, unique: true, sparse: true },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downloads: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Course = mongoose.model('Course', courseSchema);

// Fonction pour générer un token unique
function generateShareToken() {
  return crypto.randomBytes(16).toString('hex');
}

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// Routes d'authentification
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Email ou nom d\'utilisateur déjà utilisé' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

    // Générer le token
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'inscription', details: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Trouver l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Générer le token
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la connexion', details: error.message });
  }
});

// Routes pour les cours
app.post('/api/courses', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier manquant' });
    }

    const { title, description, shared } = req.body;

    const course = new Course({
      title: title || req.file.originalname.replace('.pdf', ''),
      description: description || '',
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      owner: req.user.userId,
      shared: shared === 'true'
    });

    await course.save();

    res.status(201).json({
      message: 'Cours ajouté avec succès',
      course
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'upload', details: error.message });
  }
});

app.get('/api/courses', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = {
      $or: [
        { owner: req.user.userId },
        { shared: true },
        { sharedWith: req.user.userId }
      ]
    };

    if (search) {
      query.$and = [
        { $or: query.$or },
        {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        }
      ];
      delete query.$or;
    }

    const courses = await Course.find(query)
      .populate('owner', 'username email')
      .sort({ createdAt: -1 });

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des cours', details: error.message });
  }
});

app.get('/api/courses/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('owner', 'username email');
    
    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }

    // Vérifier les permissions
    const canAccess = 
      course.owner._id.toString() === req.user.userId ||
      course.shared ||
      course.sharedWith.some(id => id.toString() === req.user.userId);

    if (!canAccess) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // Incrémenter les vues
    course.views += 1;
    await course.save();

    res.json(course);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du cours', details: error.message });
  }
});

app.patch('/api/courses/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (course.owner.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const { title, description, shared } = req.body;

    if (title !== undefined) course.title = title;
    if (description !== undefined) course.description = description;
    if (shared !== undefined) course.shared = shared;
    course.updatedAt = Date.now();

    await course.save();

    res.json({
      message: 'Cours mis à jour avec succès',
      course
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour', details: error.message });
  }
});

app.delete('/api/courses/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (course.owner.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // Supprimer le fichier
    if (fs.existsSync(course.filePath)) {
      fs.unlinkSync(course.filePath);
    }

    await Course.findByIdAndDelete(req.params.id);

    res.json({ message: 'Cours supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression', details: error.message });
  }
});

app.get('/api/courses/:id/download', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }

    // Vérifier les permissions
    const canAccess = 
      course.owner.toString() === req.user.userId ||
      course.shared ||
      course.sharedWith.some(id => id.toString() === req.user.userId);

    if (!canAccess) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // Incrémenter les téléchargements
    course.downloads += 1;
    await course.save();

    res.download(course.filePath, course.fileName);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du téléchargement', details: error.message });
  }
});

// Nouvelle route pour générer un lien de partage
app.post('/api/courses/:id/share-link', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (course.owner.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // Générer un token unique si pas déjà existant
    if (!course.shareToken) {
      course.shareToken = generateShareToken();
      course.shared = true;
      await course.save();
    }

    const shareLink = `${req.protocol}://${req.get('host')}/share/${course.shareToken}`;

    res.json({
      message: 'Lien de partage généré',
      shareLink,
      shareToken: course.shareToken
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la génération du lien', details: error.message });
  }
});

// Route pour révoquer un lien de partage
app.delete('/api/courses/:id/share-link', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (course.owner.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    course.shareToken = null;
    course.shared = false;
    await course.save();

    res.json({ message: 'Lien de partage révoqué avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la révocation du lien', details: error.message });
  }
});

// Route pour accéder à un cours via le lien de partage (sans authentification)
app.get('/api/courses/share/:token', async (req, res) => {
  try {
    const course = await Course.findOne({ shareToken: req.params.token })
      .populate('owner', 'username email');
    
    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé ou lien invalide' });
    }

    // Incrémenter les vues
    course.views += 1;
    await course.save();

    res.json(course);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du cours', details: error.message });
  }
});

// Route pour télécharger via le lien de partage (sans authentification)
app.get('/api/courses/share/:token/download', async (req, res) => {
  try {
    const course = await Course.findOne({ shareToken: req.params.token });
    
    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé ou lien invalide' });
    }

    // Incrémenter les téléchargements
    course.downloads += 1;
    await course.save();

    res.download(course.filePath, course.fileName);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du téléchargement', details: error.message });
  }
});

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Serveur fonctionnel' });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});