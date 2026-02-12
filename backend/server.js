// server.js - Backend Node.js avec Express et MongoDB
require('dotenv').config();

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
    fileSize: 10 * 1024 * 1024 // 10MB max
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
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  createdAt: { type: Date, default: Date.now }
});

const commentSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now }
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'Autre' },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shared: { type: Boolean, default: false },
  shareToken: { type: String, unique: true, sparse: true },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downloads: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  ratingsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Comment = mongoose.model('Comment', commentSchema);
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

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Email ou nom d\'utilisateur déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      favorites: []
    });

    await user.save();

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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

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

// Routes pour les favoris
app.post('/api/favorites/:courseId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }

    if (user.favorites.includes(req.params.courseId)) {
      return res.status(400).json({ error: 'Cours déjà dans les favoris' });
    }

    user.favorites.push(req.params.courseId);
    await user.save();

    res.json({ message: 'Cours ajouté aux favoris', favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'ajout aux favoris', details: error.message });
  }
});

app.delete('/api/favorites/:courseId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    user.favorites = user.favorites.filter(id => id.toString() !== req.params.courseId);
    await user.save();

    res.json({ message: 'Cours retiré des favoris', favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du retrait des favoris', details: error.message });
  }
});

app.get('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate({
      path: 'favorites',
      populate: { path: 'owner', select: 'username email' }
    });

    res.json(user.favorites || []);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des favoris', details: error.message });
  }
});

// Routes pour les commentaires
app.post('/api/courses/:courseId/comments', authenticateToken, async (req, res) => {
  try {
    const { text, rating } = req.body;
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }

    const comment = new Comment({
      course: req.params.courseId,
      user: req.user.userId,
      text,
      rating: rating || null
    });

    await comment.save();

    // Mettre à jour la note moyenne si une évaluation est fournie
    if (rating) {
      const comments = await Comment.find({ course: req.params.courseId, rating: { $exists: true, $ne: null } });
      const totalRating = comments.reduce((sum, c) => sum + c.rating, 0);
      course.averageRating = totalRating / comments.length;
      course.ratingsCount = comments.length;
      await course.save();
    }

    const populatedComment = await Comment.findById(comment._id).populate('user', 'username');

    res.status(201).json({ 
      message: 'Commentaire ajouté avec succès', 
      comment: populatedComment,
      averageRating: course.averageRating,
      ratingsCount: course.ratingsCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire', details: error.message });
  }
});

app.get('/api/courses/:courseId/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ course: req.params.courseId })
      .populate('user', 'username')
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des commentaires', details: error.message });
  }
});

app.delete('/api/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Commentaire non trouvé' });
    }

    if (comment.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const courseId = comment.course;
    const hadRating = comment.rating !== null && comment.rating !== undefined;

    await Comment.findByIdAndDelete(req.params.commentId);

    // Recalculer la note moyenne si le commentaire avait une évaluation
    if (hadRating) {
      const course = await Course.findById(courseId);
      const comments = await Comment.find({ course: courseId, rating: { $exists: true, $ne: null } });
      
      if (comments.length > 0) {
        const totalRating = comments.reduce((sum, c) => sum + c.rating, 0);
        course.averageRating = totalRating / comments.length;
        course.ratingsCount = comments.length;
      } else {
        course.averageRating = 0;
        course.ratingsCount = 0;
      }
      
      await course.save();
    }

    res.json({ message: 'Commentaire supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression du commentaire', details: error.message });
  }
});

// Routes pour les cours
app.post('/api/courses', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier manquant' });
    }

    const { title, description, shared, category } = req.body;

    const course = new Course({
      title: title || req.file.originalname.replace('.pdf', ''),
      description: description || '',
      category: category || 'Autre',
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      owner: req.user.userId,
      shared: shared === 'true',
      averageRating: 0,
      ratingsCount: 0
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

app.get('/api/courses/my-courses', authenticateToken, async (req, res) => {
  try {
    const { search, category } = req.query;
    
    let query = { owner: req.user.userId };

    if (category && category !== 'Toutes') {
      query.category = category;
    }

    if (search) {
      const baseQuery = { owner: req.user.userId };
      if (category && category !== 'Toutes') {
        baseQuery.category = category;
      }
      
      query = {
        $and: [
          baseQuery,
          {
            $or: [
              { title: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } }
            ]
          }
        ]
      };
    }

    const courses = await Course.find(query)
      .populate('owner', 'username email')
      .sort({ createdAt: -1 });

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des cours', details: error.message });
  }
});

app.get('/api/courses/public', authenticateToken, async (req, res) => {
  try {
    const { search, sort, category } = req.query;
    
    let query = { shared: true };

    if (category && category !== 'Toutes') {
      query.category = category;
    }

    if (search) {
      const baseQuery = { shared: true };
      if (category && category !== 'Toutes') {
        baseQuery.category = category;
      }

      query = {
        $and: [
          baseQuery,
          {
            $or: [
              { title: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } }
            ]
          }
        ]
      };
    }

    let sortOptions = { createdAt: -1 };

    if (sort === 'popular') {
      sortOptions = { views: -1 };
    } else if (sort === 'downloads') {
      sortOptions = { downloads: -1 };
    } else if (sort === 'rating') {
      sortOptions = { averageRating: -1 };
    } else if (sort === 'recent') {
      sortOptions = { createdAt: -1 };
    }

    const courses = await Course.find(query)
      .populate('owner', 'username email')
      .sort(sortOptions);

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des cours publics', details: error.message });
  }
});

app.get('/api/courses/shared-with-me', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = { sharedWith: req.user.userId };

    if (search) {
      query.$and = [
        { sharedWith: req.user.userId },
        {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        }
      ];
      delete query.sharedWith;
    }

    const courses = await Course.find(query)
      .populate('owner', 'username email')
      .sort({ createdAt: -1 });

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des cours partagés', details: error.message });
  }
});

app.get('/api/courses/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('owner', 'username email');
    
    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }

    const canAccess = 
      course.owner._id.toString() === req.user.userId ||
      course.shared ||
      course.sharedWith.some(id => id.toString() === req.user.userId);

    if (!canAccess) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

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

    if (course.owner.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const { title, description, shared, category } = req.body;

    if (title !== undefined) course.title = title;
    if (description !== undefined) course.description = description;
    if (shared !== undefined) course.shared = shared;
    if (category !== undefined) course.category = category;
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

    if (course.owner.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    if (fs.existsSync(course.filePath)) {
      fs.unlinkSync(course.filePath);
    }

    // Supprimer tous les commentaires associés
    await Comment.deleteMany({ course: req.params.id });

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

    const canAccess = 
      course.owner.toString() === req.user.userId ||
      course.shared ||
      course.sharedWith.some(id => id.toString() === req.user.userId);

    if (!canAccess) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    course.downloads += 1;
    await course.save();

    res.download(course.filePath, course.fileName);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du téléchargement', details: error.message });
  }
});

app.post('/api/courses/:id/share-link', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }

    if (course.owner.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

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

app.delete('/api/courses/:id/share-link', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé' });
    }

    if (course.owner.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    course.shareToken = null;
    await course.save();

    res.json({ message: 'Lien de partage révoqué avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la révocation du lien', details: error.message });
  }
});

app.get('/api/courses/share/:token', async (req, res) => {
  try {
    const course = await Course.findOne({ shareToken: req.params.token })
      .populate('owner', 'username email');
    
    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé ou lien invalide' });
    }

    course.views += 1;
    await course.save();

    res.json(course);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du cours', details: error.message });
  }
});

app.get('/api/courses/share/:token/download', async (req, res) => {
  try {
    const course = await Course.findOne({ shareToken: req.params.token });
    
    if (!course) {
      return res.status(404).json({ error: 'Cours non trouvé ou lien invalide' });
    }

    course.downloads += 1;
    await course.save();

    res.download(course.filePath, course.fileName);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du téléchargement', details: error.message });
  }
});

app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await Course.distinct('category');
    res.json(categories.filter(c => c).sort());
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des catégories', details: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Serveur fonctionnel' });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});