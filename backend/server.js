// server.js - Backend Node.js avec Express et MongoDB
require('dotenv').config();

const express    = require('express');
const mongoose   = require('mongoose');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const multer     = require('multer');
const cors       = require('cors');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app        = express();
const PORT       = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ─── DEBUG : affiche toutes les variables d'environnement importantes ─────────
console.log('🔍 DEBUG ENV :');
console.log('  PORT       :', process.env.PORT);
console.log('  CLIENT_URL :', process.env.CLIENT_URL);
console.log('  NODE_ENV   :', process.env.NODE_ENV);
console.log('  MONGODB_URI:', process.env.MONGODB_URI ? '✅ défini' : '❌ manquant');
console.log('  JWT_SECRET :', process.env.JWT_SECRET ? '✅ défini' : '❌ manquant');
// ─────────────────────────────────────────────────────────────────────────────

// ─── Middleware ──────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  CLIENT_URL,
].filter(Boolean);

console.log('🌐 Origines CORS autorisées :', allowedOrigins);

app.use((req, res, next) => {
  console.log(`📡 [${req.method}] ${req.path} | Origin: ${req.headers.origin || 'aucune'}`);
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    // Autorise les requêtes sans origin (Postman, curl, mobile, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS autorisé pour :', origin);
      return callback(null, true);
    }

    console.warn('❌ CORS bloqué pour :', origin);
    console.warn('   Origines autorisées :', allowedOrigins);
    callback(new Error(`CORS bloqué pour : ${origin}`));
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── Configuration Cloudinary ────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:        'papyrus-courses',
    resource_type: 'raw',
    format:        'pdf',
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Seuls les fichiers PDF sont autorisés'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ─── Configuration Nodemailer ────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error) console.warn('⚠️  SMTP non configuré :', error.message);
  else       console.log('✅ SMTP prêt à envoyer des emails');
});

// ─── Connexion MongoDB ───────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-share', {
  useNewUrlParser:    true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connecté'))
.catch(err => console.error('❌ Erreur MongoDB:', err));

// ═══════════════════════════════════════════════════════════════════
// Schémas MongoDB
// ═══════════════════════════════════════════════════════════════════

const userSchema = new mongoose.Schema({
  username:             { type: String, required: true, unique: true },
  email:                { type: String, required: true, unique: true },
  password:             { type: String, required: true },
  favorites:            [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  resetPasswordToken:   { type: String, default: null },
  resetPasswordExpires: { type: Date,   default: null },
  createdAt:            { type: Date,   default: Date.now }
});

const commentSchema = new mongoose.Schema({
  course:    { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  text:      { type: String, required: true },
  rating:    { type: Number, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now }
});

const courseSchema = new mongoose.Schema({
  title:         { type: String, required: true },
  description:   { type: String, default: '' },
  category:      { type: String, default: 'Autre' },
  fileName:      { type: String, required: true },
  filePath:      { type: String, required: true },
  cloudinaryId:  { type: String, default: '' },
  fileSize:      { type: Number, required: true },
  owner:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shared:        { type: Boolean, default: false },
  shareToken:    { type: String, unique: true, sparse: true },
  sharedWith:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downloads:     { type: Number, default: 0 },
  views:         { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  ratingsCount:  { type: Number, default: 0 },
  createdAt:     { type: Date, default: Date.now },
  updatedAt:     { type: Date, default: Date.now }
});

const User    = mongoose.model('User',    userSchema);
const Comment = mongoose.model('Comment', commentSchema);
const Course  = mongoose.model('Course',  courseSchema);

// ─── Helpers ─────────────────────────────────────────────────────────────────
function generateShareToken() {
  return crypto.randomBytes(16).toString('hex');
}

// ─── Middleware d'authentification ───────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token manquant' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalide' });
    req.user = user;
    next();
  });
};

// ═══════════════════════════════════════════════════════════════════
// Routes d'authentification
// ═══════════════════════════════════════════════════════════════════

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: "Email ou nom d'utilisateur déjà utilisé" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword, favorites: [] });
    await user.save();

    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'inscription", details: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Connexion réussie',
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la connexion', details: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// Mot de passe oublié / réinitialisation
// ═══════════════════════════════════════════════════════════════════

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });

    const genericResponse = {
      message: 'Si cet email est associé à un compte, un lien de réinitialisation a été envoyé.'
    };

    const user = await User.findOne({ email });
    if (!user) return res.json(genericResponse);

    const resetToken  = crypto.randomBytes(32).toString('hex');
    const expiresAt   = new Date(Date.now() + 7 * 60 * 1000);

    user.resetPasswordToken   = resetToken;
    user.resetPasswordExpires = expiresAt;
    await user.save();

    const resetLink = `${CLIENT_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      from:    process.env.EMAIL_FROM || '"Papyrus 📚" <no-reply@papyrus.app>',
      to:      user.email,
      subject: '🔒 Réinitialisation de ton mot de passe Papyrus',
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
        <body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0"
                     style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:40px 48px;text-align:center;">
                    <div style="font-size:48px;margin-bottom:8px;">📚</div>
                    <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;">Papyrus</h1>
                    <p style="margin:8px 0 0;color:#c4b5fd;font-size:14px;">Ta bibliothèque de connaissances</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:48px;">
                    <h2 style="margin:0 0 16px;color:#1f2937;font-size:22px;font-weight:700;">Réinitialise ton mot de passe 🔑</h2>
                    <p style="margin:0 0 16px;color:#6b7280;font-size:15px;line-height:1.6;">
                      Salut <strong style="color:#1f2937;">${user.username}</strong> ! 👋<br/>
                      Tu as demandé à réinitialiser ton mot de passe.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                      <tr>
                        <td style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:14px 16px;">
                          <p style="margin:0;color:#92400e;font-size:13px;font-weight:600;">
                            ⏱️ Ce lien est valable <strong>7 minutes</strong> seulement.
                          </p>
                        </td>
                      </tr>
                    </table>
                    <div style="text-align:center;margin:0 0 32px;">
                      <a href="${resetLink}"
                         style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;
                                text-decoration:none;padding:16px 40px;border-radius:14px;font-size:16px;font-weight:700;">
                        🔒 Réinitialiser mon mot de passe
                      </a>
                    </div>
                    <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;text-align:center;">
                      Si le bouton ne fonctionne pas, copie-colle ce lien :
                    </p>
                    <p style="margin:0 0 24px;word-break:break-all;color:#6b7280;font-size:11px;text-align:center;
                              background:#f9fafb;padding:10px;border-radius:8px;font-family:monospace;">
                      ${resetLink}
                    </p>
                    <hr style="border:none;border-top:1px solid #f3f4f6;margin:0 0 20px;"/>
                    <p style="margin:0;color:#d1d5db;font-size:12px;text-align:center;">
                      Si tu n'es pas à l'origine de cette demande, ignore cet email. 🛡️
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f9fafb;padding:20px 48px;text-align:center;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} Papyrus · Fait avec ❤️</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
      text: `Salut ${user.username},\n\nRéinitialise ton mot de passe (valable 7 min) :\n${resetLink}\n\nSi tu n'as pas fait cette demande, ignore cet email.`
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email envoyé à ${user.email}`);
    res.json(genericResponse);
  } catch (error) {
    console.error('Erreur forgot-password:', error);
    res.status(500).json({ error: "Erreur lors de l'envoi de l'email", details: error.message });
  }
});

app.get('/api/auth/reset-password/:token', async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken:   req.params.token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Lien invalide ou expiré. Refais une demande.' });
    }

    const secondsLeft = Math.round((user.resetPasswordExpires - Date.now()) / 1000);
    res.json({ valid: true, username: user.username, secondsLeft });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

app.post('/api/auth/reset-password/:token', async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Les mots de passe ne correspondent pas' });
    }

    const user = await User.findOne({
      resetPasswordToken:   req.params.token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Lien invalide ou expiré. Refais une demande.' });
    }

    user.password             = await bcrypt.hash(password, 10);
    user.resetPasswordToken   = null;
    user.resetPasswordExpires = null;
    await user.save();

    console.log(`✅ Mot de passe réinitialisé pour ${user.email}`);
    res.json({ message: 'Mot de passe réinitialisé avec succès ! Tu peux maintenant te connecter.' });
  } catch (error) {
    console.error('Erreur reset-password:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// Routes pour les favoris
// ═══════════════════════════════════════════════════════════════════

app.post('/api/favorites/:courseId', authenticateToken, async (req, res) => {
  try {
    const user   = await User.findById(req.user.userId);
    const course = await Course.findById(req.params.courseId);

    if (!course) return res.status(404).json({ error: 'Cours non trouvé' });
    if (user.favorites.includes(req.params.courseId)) {
      return res.status(400).json({ error: 'Cours déjà dans les favoris' });
    }

    user.favorites.push(req.params.courseId);
    await user.save();
    res.json({ message: 'Cours ajouté aux favoris', favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'ajout aux favoris", details: error.message });
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
      path:     'favorites',
      populate: { path: 'owner', select: 'username email' }
    });
    res.json(user.favorites || []);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des favoris', details: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// Routes pour les commentaires
// ═══════════════════════════════════════════════════════════════════

app.post('/api/courses/:courseId/comments', authenticateToken, async (req, res) => {
  try {
    const { text, rating } = req.body;
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ error: 'Cours non trouvé' });

    const comment = new Comment({
      course: req.params.courseId,
      user:   req.user.userId,
      text,
      rating: rating || null
    });
    await comment.save();

    if (rating) {
      const comments    = await Comment.find({ course: req.params.courseId, rating: { $exists: true, $ne: null } });
      const totalRating = comments.reduce((sum, c) => sum + c.rating, 0);
      course.averageRating = totalRating / comments.length;
      course.ratingsCount  = comments.length;
      await course.save();
    }

    const populatedComment = await Comment.findById(comment._id).populate('user', 'username');
    res.status(201).json({
      message:       'Commentaire ajouté avec succès',
      comment:       populatedComment,
      averageRating: course.averageRating,
      ratingsCount:  course.ratingsCount
    });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'ajout du commentaire", details: error.message });
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
    if (!comment) return res.status(404).json({ error: 'Commentaire non trouvé' });
    if (comment.user.toString() !== req.user.userId) return res.status(403).json({ error: 'Accès non autorisé' });

    const courseId  = comment.course;
    const hadRating = comment.rating !== null && comment.rating !== undefined;
    await Comment.findByIdAndDelete(req.params.commentId);

    if (hadRating) {
      const course   = await Course.findById(courseId);
      const comments = await Comment.find({ course: courseId, rating: { $exists: true, $ne: null } });

      if (comments.length > 0) {
        const totalRating    = comments.reduce((sum, c) => sum + c.rating, 0);
        course.averageRating = totalRating / comments.length;
        course.ratingsCount  = comments.length;
      } else {
        course.averageRating = 0;
        course.ratingsCount  = 0;
      }
      await course.save();
    }

    res.json({ message: 'Commentaire supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la suppression du commentaire', details: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// Routes pour les cours
// ═══════════════════════════════════════════════════════════════════

app.post('/api/courses', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier manquant' });

    const { title, description, shared, category } = req.body;

    const course = new Course({
      title:        title || req.file.originalname.replace('.pdf', ''),
      description:  description || '',
      category:     category || 'Autre',
      fileName:     req.file.originalname,
      filePath:     req.file.path,
      cloudinaryId: req.file.filename,
      fileSize:     req.file.size,
      owner:        req.user.userId,
      shared:       shared === 'true',
      averageRating: 0,
      ratingsCount:  0
    });
    await course.save();
    res.status(201).json({ message: 'Cours ajouté avec succès', course });
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de l'upload", details: error.message });
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
        { $or: [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }] }
      ];
      delete query.$or;
    }

    const courses = await Course.find(query).populate('owner', 'username email').sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des cours', details: error.message });
  }
});

app.get('/api/courses/my-courses', authenticateToken, async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = { owner: req.user.userId };

    if (category && category !== 'Toutes') query.category = category;

    if (search) {
      const base = { owner: req.user.userId };
      if (category && category !== 'Toutes') base.category = category;
      query = {
        $and: [
          base,
          { $or: [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }] }
        ]
      };
    }

    const courses = await Course.find(query).populate('owner', 'username email').sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des cours', details: error.message });
  }
});

app.get('/api/courses/public', authenticateToken, async (req, res) => {
  try {
    const { search, sort, category } = req.query;
    let query = { shared: true };

    if (category && category !== 'Toutes') query.category = category;

    if (search) {
      const base = { shared: true };
      if (category && category !== 'Toutes') base.category = category;
      query = {
        $and: [
          base,
          { $or: [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }] }
        ]
      };
    }

    let sortOptions = { createdAt: -1 };
    if (sort === 'popular')   sortOptions = { views: -1 };
    if (sort === 'downloads') sortOptions = { downloads: -1 };
    if (sort === 'rating')    sortOptions = { averageRating: -1 };

    const courses = await Course.find(query).populate('owner', 'username email').sort(sortOptions);
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
        { $or: [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }] }
      ];
      delete query.sharedWith;
    }

    const courses = await Course.find(query).populate('owner', 'username email').sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des cours partagés', details: error.message });
  }
});

app.get('/api/courses/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('owner', 'username email');
    if (!course) return res.status(404).json({ error: 'Cours non trouvé' });

    const canAccess =
      course.owner._id.toString() === req.user.userId ||
      course.shared ||
      course.sharedWith.some(id => id.toString() === req.user.userId);

    if (!canAccess) return res.status(403).json({ error: 'Accès non autorisé' });

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
    if (!course) return res.status(404).json({ error: 'Cours non trouvé' });
    if (course.owner.toString() !== req.user.userId) return res.status(403).json({ error: 'Accès non autorisé' });

    const { title, description, shared, category } = req.body;
    if (title       !== undefined) course.title       = title;
    if (description !== undefined) course.description = description;
    if (shared      !== undefined) course.shared      = shared;
    if (category    !== undefined) course.category    = category;
    course.updatedAt = Date.now();
    await course.save();

    res.json({ message: 'Cours mis à jour avec succès', course });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour', details: error.message });
  }
});

app.delete('/api/courses/:id', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Cours non trouvé' });
    if (course.owner.toString() !== req.user.userId) return res.status(403).json({ error: 'Accès non autorisé' });

    if (course.cloudinaryId) {
      await cloudinary.uploader.destroy(course.cloudinaryId, { resource_type: 'raw' });
    }

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
    if (!course) return res.status(404).json({ error: 'Cours non trouvé' });

    const canAccess =
      course.owner.toString() === req.user.userId ||
      course.shared ||
      course.sharedWith.some(id => id.toString() === req.user.userId);

    if (!canAccess) return res.status(403).json({ error: 'Accès non autorisé' });

    course.downloads += 1;
    await course.save();
    res.redirect(course.filePath);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du téléchargement', details: error.message });
  }
});

app.post('/api/courses/:id/share-link', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Cours non trouvé' });
    if (course.owner.toString() !== req.user.userId) return res.status(403).json({ error: 'Accès non autorisé' });

    if (!course.shareToken) {
      course.shareToken = generateShareToken();
      course.shared     = true;
      await course.save();
    }

    const shareLink = `${CLIENT_URL}/share/${course.shareToken}`;
    res.json({ message: 'Lien de partage généré', shareLink, shareToken: course.shareToken });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la génération du lien', details: error.message });
  }
});

app.delete('/api/courses/:id/share-link', authenticateToken, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Cours non trouvé' });
    if (course.owner.toString() !== req.user.userId) return res.status(403).json({ error: 'Accès non autorisé' });

    course.shareToken = null;
    await course.save();
    res.json({ message: 'Lien de partage révoqué avec succès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la révocation du lien', details: error.message });
  }
});

app.get('/api/courses/share/:token', async (req, res) => {
  try {
    const course = await Course.findOne({ shareToken: req.params.token }).populate('owner', 'username email');
    if (!course) return res.status(404).json({ error: 'Cours non trouvé ou lien invalide' });

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
    if (!course) return res.status(404).json({ error: 'Cours non trouvé ou lien invalide' });

    course.downloads += 1;
    await course.save();
    res.redirect(course.filePath);
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
  res.json({
    status: 'OK',
    message: 'Serveur fonctionnel ✅',
    CLIENT_URL,
    allowedOrigins,
    NODE_ENV: process.env.NODE_ENV
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});