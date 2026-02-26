import React, { useState, useEffect } from 'react';
import { Upload, FileText, Share2, Download, Trash2, Search, Eye, LogOut, User, Lock, Mail, X, Copy, Link as LinkIcon, ArrowLeft, Clock, Star, BookOpen, Sparkles, Zap, Heart, MessageSquare } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function CourseShareApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [authMode, setAuthMode] = useState('login');

  const [activeTab, setActiveTab] = useState('my-courses');
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [categoryFilter, setCategoryFilter] = useState('Toutes');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', category: 'Autre', file: null });

  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);

  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(0);
  const [currentCourseForComments, setCurrentCourseForComments] = useState(null);

  const categories = [
    'Toutes', 'Mathématiques', 'Physique', 'Chimie', 'Informatique',
    'Histoire', 'Géographie', 'Philosophie', 'Langues', 'Économie',
    'Droit', 'Médecine', 'Biologie', 'Littérature', 'Arts', 'Sport', 'Autre'
  ];

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentShareCourse, setCurrentShareCourse] = useState(null);

  const [isPublicView, setIsPublicView] = useState(false);
  const [publicCourse, setPublicCourse] = useState(null);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState(null);

  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' });
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetTokenValid, setResetTokenValid] = useState(null);
  const [resetUsername, setResetUsername] = useState('');
  const [resetSecondsLeft, setResetSecondsLeft] = useState(null);

  useEffect(() => {
    const path = window.location.pathname;
    const shareMatch = path.match(/^\/share\/([a-f0-9]+)$/);
    const resetMatch = path.match(/^\/reset-password\/([a-f0-9]+)$/);

    if (shareMatch) {
      setIsPublicView(true);
      loadPublicCourse(shareMatch[1]);
    } else if (resetMatch) {
      setResetToken(resetMatch[1]);
      setShowResetModal(true);
      setShowAuthModal(false);
      verifyResetToken(resetMatch[1]);
    } else {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      if (token && userData) {
        setIsAuthenticated(true);
        setUser(JSON.parse(userData));
        setShowAuthModal(false);
        loadCourses('my-courses');
        loadFavorites();
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isPublicView) loadCourses(activeTab);
  }, [activeTab, sortBy, categoryFilter]);

  useEffect(() => {
    if (resetSecondsLeft === null || resetSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setResetSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setResetTokenValid(false);
          setResetError('Le lien a expiré. Refais une demande de réinitialisation.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [resetSecondsLeft]);

  const resolvePdfUrl = (filePath) => {
    if (!filePath) return '';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
    const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';
    return `${BASE_URL}/${filePath}`;
  };

  const getPdfViewerUrl = (filePath) => {
    const url = resolvePdfUrl(filePath);
    if (url.includes('cloudinary.com')) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    }
    return url;
  };

  const loadPublicCourse = async (token) => {
    setPublicLoading(true);
    setPublicError(null);
    try {
      const response = await fetch(`${API_URL}/courses/share/${token}`);
      if (!response.ok) throw new Error('Cours non trouvé ou lien invalide');
      setPublicCourse(await response.json());
    } catch (error) {
      setPublicError(error.message);
    } finally {
      setPublicLoading(false);
    }
  };

  const downloadPublicPDF = async (token, fileName) => {
    try {
      const response = await fetch(`${API_URL}/courses/share/${token}/download`);
      if (!response.ok) throw new Error('Erreur lors du téléchargement');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Erreur lors du téléchargement');
    }
  };

  const verifyResetToken = async (token) => {
    setResetTokenValid(null);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password/${token}`);
      const data = await response.json();
      if (!response.ok) {
        setResetTokenValid(false);
        setResetError(data.error || 'Lien invalide ou expiré.');
      } else {
        setResetTokenValid(true);
        setResetUsername(data.username);
        setResetSecondsLeft(data.secondsLeft);
      }
    } catch {
      setResetTokenValid(false);
      setResetError('Erreur de connexion au serveur.');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotMessage('');
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur serveur');
      setForgotMessage(data.message);
    } catch (error) {
      setForgotError(error.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetMessage('');
    try {
      const response = await fetch(`${API_URL}/auth/reset-password/${resetToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetForm.password, confirmPassword: resetForm.confirmPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur serveur');
      setResetMessage(data.message);
      setTimeout(() => {
        setShowResetModal(false);
        setShowAuthModal(true);
        setAuthMode('login');
        window.history.pushState({}, '', '/');
      }, 2000);
    } catch (error) {
      setResetError(error.message);
    } finally {
      setResetLoading(false);
    }
  };

  const formatCountdown = (seconds) => {
    if (seconds === null) return '';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const body = authMode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : { username: authForm.username, email: authForm.email, password: authForm.password };

      if (authMode === 'register' && authForm.password !== authForm.confirmPassword) {
        alert('Les mots de passe ne correspondent pas');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur d'authentification");

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setIsAuthenticated(true);
      setUser(data.user);
      setShowAuthModal(false);
      setAuthForm({ username: '', email: '', password: '', confirmPassword: '' });
      await loadCourses('my-courses');
      await loadFavorites();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    setCourses([]);
    setFavorites([]);
    setShowAuthModal(true);
  };

  const loadCourses = async (tab = activeTab) => {
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      const params = new URLSearchParams();

      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter && categoryFilter !== 'Toutes') params.append('category', categoryFilter);

      switch (tab) {
        case 'my-courses': endpoint = '/courses/my-courses'; break;
        case 'discover':
          endpoint = '/courses/public';
          params.append('sort', sortBy);
          break;
        case 'shared': endpoint = '/courses/shared-with-me'; break;
        default: endpoint = '/courses';
      }

      const url = `${API_URL}${endpoint}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Erreur lors du chargement des cours');
      setCourses(await response.json());
    } catch {
      alert('Erreur lors du chargement des cours');
    }
  };

  const loadFavorites = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/favorites`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error();
      setFavorites(await response.json());
    } catch {
      console.error('Erreur chargement favoris');
    }
  };

  const toggleFavorite = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      const isFav = favorites.some(fav => fav._id === courseId);
      const response = await fetch(`${API_URL}/favorites/${courseId}`, {
        method: isFav ? 'DELETE' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error();
      await loadFavorites();
      await loadCourses();
    } catch {
      alert('Erreur lors de la gestion des favoris');
    }
  };

  const isFavorite = (courseId) => favorites.some(fav => fav._id === courseId);

  const loadComments = async (courseId) => {
    try {
      const response = await fetch(`${API_URL}/courses/${courseId}/comments`);
      if (!response.ok) throw new Error();
      setComments(await response.json());
    } catch {
      console.error('Erreur chargement commentaires');
    }
  };

  const openComments = (course) => {
    setCurrentCourseForComments(course);
    setShowComments(true);
    loadComments(course._id);
  };

  const submitComment = async () => {
    if (!newComment.trim() && newRating === 0) {
      alert('Veuillez ajouter un commentaire ou une note');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/courses/${currentCourseForComments._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text: newComment, rating: newRating > 0 ? newRating : null })
      });
      if (!response.ok) throw new Error();
      setNewComment('');
      setNewRating(0);
      await loadComments(currentCourseForComments._id);
      await loadCourses();
    } catch {
      alert("Erreur lors de l'ajout du commentaire");
    }
  };

  const deleteComment = async (commentId) => {
    if (!confirm('Voulez-vous vraiment supprimer ce commentaire ?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error();
      await loadComments(currentCourseForComments._id);
      await loadCourses();
    } catch {
      alert('Erreur lors de la suppression du commentaire');
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Veuillez sélectionner un fichier PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Le fichier est trop volumineux. Taille maximale : 10 Mo');
      return;
    }
    setUploadForm({ ...uploadForm, file, title: file.name.replace('.pdf', '') });
    setShowUploadModal(true);
    event.target.value = '';
  };

  const handleFileUpload = async () => {
    if (!uploadForm.file) return;
    setUploadProgress(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('title', uploadForm.title);
      formData.append('category', uploadForm.category);
      formData.append('shared', 'false');

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/courses`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!response.ok) throw new Error();
      await loadCourses();
      setShowUploadModal(false);
      setUploadForm({ title: '', category: 'Autre', file: null });
      alert('Cours ajouté avec succès !');
    } catch {
      alert("Erreur lors de l'upload du fichier");
    } finally {
      setUploadProgress(false);
    }
  };

  const toggleShare = async (course) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/courses/${course._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ shared: !course.shared })
      });
      if (!response.ok) throw new Error();
      await loadCourses();
    } catch {
      alert('Erreur lors du partage du cours');
    }
  };

  const generateShareLink = async (course) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/courses/${course._id}/share-link`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setShareLink(`${window.location.origin}/share/${data.shareToken}`);
      setCurrentShareCourse(course);
      setShowShareModal(true);
      await loadCourses();
    } catch {
      alert('Erreur lors de la génération du lien de partage');
    }
  };

  const revokeShareLink = async () => {
    if (!currentShareCourse) return;
    if (!confirm('Voulez-vous vraiment révoquer ce lien de partage ?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/courses/${currentShareCourse._id}/share-link`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error();
      setShowShareModal(false);
      setShareLink('');
      setCurrentShareCourse(null);
      await loadCourses();
      alert('Lien de partage révoqué avec succès');
    } catch {
      alert('Erreur lors de la révocation du lien');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const deleteCourse = async (courseId) => {
    if (!confirm('Voulez-vous vraiment supprimer ce cours ?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/courses/${courseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error();
      await loadCourses();
      if (selectedCourse?._id === courseId) setSelectedCourse(null);
    } catch {
      alert('Erreur lors de la suppression du cours');
    }
  };

  const downloadPDF = async (courseId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/courses/${courseId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Erreur lors du téléchargement');
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setTimeout(() => loadCourses(), 300);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (isoDate) =>
    new Date(isoDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const isOwner = (course) => course.owner._id === user?.id || course.owner === user?.id;

  const getCategoryColor = (category) => {
    const colors = {
      'Mathématiques': 'cat-math',      'Physique':    'cat-physics',
      'Chimie':        'cat-chemistry', 'Informatique':'cat-cs',
      'Histoire':      'cat-history',   'Géographie':  'cat-geo',
      'Philosophie':   'cat-philo',     'Langues':     'cat-languages',
      'Économie':      'cat-economy',   'Droit':       'cat-law',
      'Médecine':      'cat-medicine',  'Biologie':    'cat-biology',
      'Littérature':   'cat-literature','Arts':        'cat-arts',
      'Sport':         'cat-sport',     'Autre':       'cat-other'
    };
    return colors[category] || 'cat-other';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Mathématiques': '📐', 'Physique':    '⚛️',  'Chimie':      '🧪',
      'Informatique':  '💻', 'Histoire':    '📜',  'Géographie':  '🌍',
      'Philosophie':   '🤔', 'Langues':     '🗣️', 'Économie':   '💰',
      'Droit':         '⚖️', 'Médecine':    '🏥',  'Biologie':   '🧬',
      'Littérature':   '📚', 'Arts':        '🎨',  'Sport':       '⚽',
      'Autre':         '📄'
    };
    return icons[category] || '📄';
  };

  const renderStars = (rating, interactive = false, onRate = null) => (
    <div className="stars-container">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`star ${interactive ? 'star--interactive' : ''} ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          onClick={() => interactive && onRate && onRate(star)}
        />
      ))}
    </div>
  );

  // ─── Vue publique ──────────────────────────────────────────────────────────

  if (isPublicView) {
    if (publicLoading) {
      return (
        <div className="page-wrapper page-wrapper--centered">
          <div className="loading-center">
            <div className="spinner-lg" />
            <p className="spinner-loading-text animate-pulse">Chargement du cours...</p>
          </div>
        </div>
      );
    }

    if (publicError || !publicCourse) {
      return (
        <div className="page-wrapper page-wrapper--centered">
          <div className="card card--error">
            <div className="error-icon">
              <X className="app-logo-icon--lg" />
            </div>
            <h2 className="error-title">Oups ! 😕</h2>
            <p className="error-text">{publicError || 'Le lien de partage est invalide ou a été révoqué.'}</p>
            <button onClick={() => window.location.href = '/'} className="btn btn-primary mx-auto">
              <ArrowLeft />&nbsp;Retour à l'accueil
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="page-wrapper">
        <div className="public-container">
          {/* Header public */}
          <div className="card-hover mb-6">
            <div className="public-header-inner">
              <div className="header-logo-wrap">
                <div className="app-logo--sm">
                  <BookOpen className="app-logo-icon--lg" />
                </div>
                <div>
                  <h1 className="app-title">Papyrus 📚</h1>
                  <p className="app-subtitle--shared">Cours partagé avec amour ❤️</p>
                </div>
              </div>
              <button onClick={() => window.location.href = '/'} className="btn btn-neutral">
                <ArrowLeft />&nbsp;Accueil
              </button>
            </div>
          </div>

          {/* Détail du cours */}
          <div className="card-lg mb-6">
            <div className="course-detail-top">
              <div className="course-detail-top__body">
                <div className="course-detail-title-row">
                  <span className="course-detail-emoji">{getCategoryIcon(publicCourse.category)}</span>
                  <h2 className="course-detail-title">{publicCourse.title}</h2>
                </div>
                <div className="course-detail-meta">
                  <div className="badge-user">
                    <User /><span>{publicCourse.owner.username}</span>
                  </div>
                  <span className={`category-badge ${getCategoryColor(publicCourse.category)}`}>
                    {publicCourse.category || 'Autre'}
                  </span>
                  {publicCourse.averageRating > 0 && (
                    <div className="btn-rating">
                      <Star className="fill-yellow-400" />
                      {publicCourse.averageRating.toFixed(1)} ({publicCourse.ratingsCount})
                    </div>
                  )}
                </div>
                {publicCourse.description && (
                  <p className="course-detail-description">{publicCourse.description}</p>
                )}
                <div className="course-stats">
                  <div className="badge-stat bg-blue-50">
                    <FileText className="text-blue-600" /><span>{formatFileSize(publicCourse.fileSize)}</span>
                  </div>
                  <div className="badge-stat bg-green-50">
                    <Eye className="text-green-600" /><span>{publicCourse.views} vues</span>
                  </div>
                  <div className="badge-stat bg-purple-50">
                    <Download className="text-purple-600" /><span>{publicCourse.downloads} téléchargements</span>
                  </div>
                  <div className="badge-stat bg-orange-50">
                    <Clock className="text-orange-600" /><span>{formatDate(publicCourse.createdAt)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => downloadPublicPDF(publicCourse.shareToken, publicCourse.fileName)}
                className="btn btn-success btn-lg"
              >
                <Download />&nbsp;Télécharger
              </button>
            </div>

            <div className="pdf-wrapper">
              <iframe
                src={getPdfViewerUrl(publicCourse.filePath)}
                className="pdf-viewer-public"
                title={publicCourse.title}
              />
            </div>
          </div>

          {/* CTA rejoindre */}
          <div className="cta-section">
            <div className="cta-section__sparkle">
              <Sparkles className="animate-bounce" />
            </div>
            <h3 className="cta-section__title">Tu kiffes ce contenu ? 🔥</h3>
            <p className="cta-section__subtitle">
              Rejoins la communauté Papyrus et partage tes propres cours ! C'est gratuit et ça prend 30 secondes ⚡
            </p>
            <button onClick={() => window.location.href = '/'} className="btn-cta">
              <Zap />Rejoindre Papyrus<Zap />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Page reset mot de passe ───────────────────────────────────────────────

  if (showResetModal) {
    return (
      <div className="page-wrapper page-wrapper--centered">
        <div className="card card--auth">
          <div className="auth-header">
            <div className="app-logo">
              <BookOpen className="app-logo-icon" />
            </div>
            <h1 className="app-title">Papyrus 📚</h1>
            <p className="auth-header__subtitle">Nouveau mot de passe 🔒</p>
          </div>

          {resetTokenValid === null && (
            <div className="loading-center">
              <div className="spinner-lg" />
              <p className="loading-center__text">Vérification du lien...</p>
            </div>
          )}

          {resetTokenValid === false && (
            <div className="text-center">
              <div className="alert-error">
                <p className="alert-error__title">❌ Lien invalide ou expiré</p>
                <p className="alert-error__text">{resetError}</p>
              </div>
              <button
                onClick={() => { setShowResetModal(false); setShowForgotModal(true); window.history.pushState({}, '', '/'); }}
                className="btn btn-primary btn-full"
              >
                Refaire une demande 🔄
              </button>
            </div>
          )}

          {resetTokenValid === true && !resetMessage && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {resetUsername && (
                <div className="alert-info">
                  <p className="alert-info__username">
                    Salut <strong>{resetUsername}</strong> ! 👋
                  </p>
                  <p className="alert-info__hint">Choisis un nouveau mot de passe</p>
                  {resetSecondsLeft > 0 && (
                    <p className="alert-info__countdown">
                      ⏱️ Expire dans :{' '}
                      <span className="alert-info__countdown-time">{formatCountdown(resetSecondsLeft)}</span>
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="form-label">Nouveau mot de passe 🔑</label>
                <div className="input-wrap">
                  <Lock className="input-wrap__icon" />
                  <input
                    type="password"
                    value={resetForm.password}
                    onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
                    className="input-with-icon"
                    placeholder="Au moins 6 caractères"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Confirme le mot de passe 🔐</label>
                <div className="input-wrap">
                  <Lock className="input-wrap__icon" />
                  <input
                    type="password"
                    value={resetForm.confirmPassword}
                    onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                    className="input-with-icon"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {resetError && (
                <div className="alert-error">
                  <p className="alert-error__sm">❌ {resetError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="btn btn-primary btn-full"
              >
                {resetLoading
                  ? <><div className="spinner" />En cours...</>
                  : <><Zap />Changer le mot de passe<Zap /></>
                }
              </button>
            </form>
          )}

          {resetMessage && (
            <div className="text-center">
              <div className="alert-success">
                <p className="alert-success__title">✅ Succès !</p>
                <p className="alert-success__text">{resetMessage}</p>
                <p className="alert-success__redirect">Redirection vers la connexion...</p>
              </div>
              <div className="spinner-success" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Modal auth ────────────────────────────────────────────────────────────

  if (showAuthModal) {
    return (
      <div className="page-wrapper page-wrapper--centered">
        <div className="card card--auth">
          <div className="auth-header">
            <div className="app-logo">
              <BookOpen className="app-logo-icon" />
            </div>
            <h1 className="app-title">Papyrus 📚</h1>
            <p className="auth-header__subtitle">
              {authMode === 'login' ? 'Bon retour parmi nous ! 👋' : 'Rejoins la communauté ! 🚀'}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            {authMode === 'register' && (
              <div>
                <label className="form-label">Nom d'utilisateur ✨</label>
                <div className="input-wrap">
                  <User className="input-wrap__icon" />
                  <input
                    type="text"
                    value={authForm.username}
                    onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                    className="input-with-icon"
                    placeholder="ton_super_pseudo"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="form-label">Email 📧</label>
              <div className="input-wrap">
                <Mail className="input-wrap__icon" />
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  className="input-with-icon"
                  placeholder="email@exemple.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="form-label">Mot de passe 🔒</label>
              <div className="input-wrap">
                <Lock className="input-wrap__icon" />
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  className="input-with-icon"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {authMode === 'register' && (
              <div>
                <label className="form-label">Confirme ton mot de passe 🔐</label>
                <div className="input-wrap">
                  <Lock className="input-wrap__icon" />
                  <input
                    type="password"
                    value={authForm.confirmPassword}
                    onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                    className="input-with-icon"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary btn-full">
              {loading
                ? <><div className="spinner" />Chargement...</>
                : <><Zap />{authMode === 'login' ? 'Se connecter' : "S'inscrire"}<Zap /></>
              }
            </button>
          </form>

          {authMode === 'login' && (
            <div className="text-center mt-4">
              <button onClick={() => setShowForgotModal(true)} className="btn-forgot">
                Mot de passe oublié ? 🤔
              </button>
            </div>
          )}

          <div className="text-center mt-6">
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthForm({ username: '', email: '', password: '', confirmPassword: '' });
              }}
              className="btn-switch-mode"
            >
              {authMode === 'login'
                ? "Pas encore de compte ? Inscris-toi ! 🎉"
                : 'Déjà un compte ? Connecte-toi ! 👍'}
            </button>
          </div>
        </div>

        {/* Modal mot de passe oublié */}
        {showForgotModal && (
          <div className="modal-backdrop">
            <div className="modal-box">
              <div className="modal-header">
                <h2 className="modal-title">Mot de passe oublié 🔑</h2>
                <button
                  onClick={() => { setShowForgotModal(false); setForgotEmail(''); setForgotMessage(''); setForgotError(''); }}
                  className="modal-close-btn"
                >
                  <X />
                </button>
              </div>

              <div className="modal-body">
                {!forgotMessage ? (
                  <>
                    <p className="forgot-hint-text">
                      Saisis ton email et on t'envoie un lien de réinitialisation valable <strong>7 minutes</strong> ! ⏱️
                    </p>
                    <form onSubmit={handleForgotPassword} className="space-y-5">
                      <div>
                        <label className="form-label">Ton email 📧</label>
                        <div className="input-wrap">
                          <Mail className="input-wrap__icon" />
                          <input
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="input-with-icon"
                            placeholder="email@exemple.com"
                            required
                          />
                        </div>
                      </div>
                      {forgotError && (
                        <div className="alert-error">
                          <p className="alert-error__sm">❌ {forgotError}</p>
                        </div>
                      )}
                      <button type="submit" disabled={forgotLoading} className="btn btn-primary btn-full">
                        {forgotLoading
                          ? <><div className="spinner" />Envoi en cours...</>
                          : <><Mail />&nbsp;Envoyer le lien&nbsp;<Zap /></>
                        }
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="forgot-success-icon">
                      <Mail className="app-logo-icon--lg" />
                    </div>
                    <p className="forgot-success-title">Email envoyé ! 📬</p>
                    <p className="forgot-success-text">{forgotMessage}</p>
                    <div className="alert-warning">
                      <p className="alert-warning__text">
                        ⏱️ N'oublie pas : le lien expire dans <strong>7 minutes</strong> !
                      </p>
                    </div>
                    <button
                      onClick={() => { setShowForgotModal(false); setForgotEmail(''); setForgotMessage(''); setForgotError(''); }}
                      className="btn btn-primary btn-full"
                    >
                      Retour à la connexion 👍
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── App principale ────────────────────────────────────────────────────────

  return (
    <div className="page-wrapper">
      <div className="content-container">

        {/* Header */}
        <div className="card-hover mb-6">
          <div className="header-inner">
            <div className="header-logo-wrap">
              <div className="app-logo--sm">
                <BookOpen className="app-logo-icon--lg" />
              </div>
              <div>
                <h1 className="app-title">Papyrus 📚</h1>
                <p className="app-subtitle">Ta bibliothèque de connaissances</p>
              </div>
            </div>
            <div className="header-actions">
              <button
                onClick={() => setShowFavorites(!showFavorites)}
                className={`btn ${showFavorites ? 'btn-danger' : 'btn-neutral'}`}
              >
                <Heart className={showFavorites ? 'fill-yellow-400' : ''} />
                Favoris ({favorites.length})
              </button>
              <div className="header-user-info">
                <p className="header-user-info__label">Connecté en tant que</p>
                <p className="header-user-info__name">{user?.username} 👤</p>
              </div>
              <button onClick={handleLogout} className="btn btn-danger">
                <LogOut />Déconnexion
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'my-courses', icon: <FileText />, label: 'Mes Cours' },
              { key: 'discover',   icon: <Search />,   label: 'Découvrir' },
              { key: 'shared',     icon: <Share2 />,   label: 'Partagés' }
            ].map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setShowFavorites(false); }}
                className={activeTab === key ? 'tab-btn-active' : 'tab-btn'}
              >
                <div className="tab-btn__inner">{icon}{label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Zone upload */}
        {activeTab === 'my-courses' && !showFavorites && (
          <div className="card-hover p-8 mb-6">
            <label className="drop-zone">
              <div className="drop-zone__icon-wrap">
                <Upload className="app-logo-icon--lg" />
              </div>
              <span className="drop-zone__title">Ajoute ton PDF ici ! 📄</span>
              <span className="drop-zone__subtitle">Taille max: 10 Mo · Formats: PDF uniquement</span>
              <input type="file" accept=".pdf,application/pdf" onChange={handleFileSelect} className="hidden" />
            </label>
          </div>
        )}

        {/* Barre de recherche */}
        {!showFavorites && (
          <div className="card p-4 mb-6">
            <div className="search-bar">
              <div className="search-input-wrap">
                <Search className="search-input-wrap__icon" />
                <input
                  type="text"
                  placeholder="Cherche un cours... 🔍"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="input-field"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input-field input-field--select"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{getCategoryIcon(cat)} {cat}</option>
                ))}
              </select>
              {activeTab === 'discover' && (
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input-field input-field--select"
                >
                  <option value="recent">🆕 Plus récents</option>
                  <option value="popular">🔥 Plus populaires</option>
                  <option value="downloads">⬇️ Plus téléchargés</option>
                  <option value="rating">⭐ Mieux notés</option>
                </select>
              )}
            </div>
          </div>
        )}

        {/* Grille de cours */}
        <div className="courses-grid">
          {(showFavorites ? favorites : courses).length === 0 ? (
            <div className="courses-grid__empty">
              <div className="courses-grid__empty-icon">
                {showFavorites
                  ? <Heart className="app-logo-icon--lg" />
                  : <FileText className="app-logo-icon--lg" />}
              </div>
              <p className="courses-grid__empty-text">
                {showFavorites
                  ? 'Aucun cours favori pour le moment ! ❤️'
                  : searchTerm
                    ? 'Aucun cours trouvé 😕'
                    : activeTab === 'my-courses'
                      ? 'Aucun cours pour le moment ! Ajoute ton premier cours 🚀'
                      : activeTab === 'discover'
                        ? 'Aucun cours public disponible 📚'
                        : 'Aucun cours partagé avec toi 💌'}
              </p>
            </div>
          ) : (
            (showFavorites ? favorites : courses).map((course) => (
              <div key={course._id} className="course-card card">

                {/* ── Header ── */}
                <div className="course-card-header">
                  <div className="course-card-header__body">

                    <div className="course-card-header__title-row">
                      <span className="course-card-header__emoji">{getCategoryIcon(course.category)}</span>
                      <h3 className="course-card-title">{course.title}</h3>
                    </div>

                    <div className="course-card-header__user-row">
                      <div className="badge-user">
                        <User /><span>{course.owner.username}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(course._id); }}
                        className={isFavorite(course._id) ? 'btn-fav-active' : 'btn-fav-inactive'}
                      >
                        <Heart className={isFavorite(course._id) ? 'fill-yellow-400' : ''} />
                      </button>
                    </div>

                    <div className="course-card-header__cat-row">
                      <span className={`category-badge ${getCategoryColor(course.category)}`}>
                        {course.category || 'Autre'}
                      </span>
                    </div>

                    {course.averageRating > 0 && (
                      <div className="course-card-header__rating-row">
                        {renderStars(Math.round(course.averageRating))}
                        <span className="course-card-rating-text">
                          {course.averageRating.toFixed(1)} ({course.ratingsCount})
                        </span>
                      </div>
                    )}

                    <div className="course-card-header__meta-row">
                      <span className="course-card-meta-size">{formatFileSize(course.fileSize)}</span>
                      <span className="course-card-meta-dot">•</span>
                      <span className="course-card-meta-date">{formatDate(course.createdAt)}</span>
                    </div>
                  </div>

                  {/* Badge public/privé */}
                  <div className={`course-card-status ${course.shared ? 'course-card-status--public' : 'course-card-status--private'}`}>
                    {course.shared ? '🌍' : '🔒'}
                    <span className="sm-inline">&nbsp;{course.shared ? 'Public' : 'Privé'}</span>
                  </div>
                </div>

                {/* ── Lien actif ── */}
                {course.shareToken && isOwner(course) && (
                  <div className="course-link-active">
                    <LinkIcon className="text-blue-600" />
                    <span className="course-link-active__text">🔗 Lien actif</span>
                  </div>
                )}

                {/* ── Stats ── */}
                <div className="course-card-stats">
                  <div className="badge-stat bg-green-50">
                    <Eye className="text-green-600" /><span>{course.views}</span>
                  </div>
                  <div className="badge-stat bg-purple-50">
                    <Download className="text-purple-600" /><span>{course.downloads}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); openComments(course); }}
                    className="badge-stat bg-blue-50 badge-stat--btn"
                  >
                    <MessageSquare className="text-blue-600" /><span>Avis</span>
                  </button>
                </div>

                {/* ── Boutons d'action ── */}
                <div className="course-card-actions">
                  <div className="course-card-actions__row">
                    <button onClick={() => setSelectedCourse(course)} className="btn btn-primary btn-card-action">
                      <Eye /><span>Voir</span>
                    </button>
                    <button onClick={() => downloadPDF(course._id, course.fileName)} className="btn btn-success btn-card-icon">
                      <Download />
                    </button>
                    {isOwner(course) && (
                      <button onClick={() => deleteCourse(course._id)} className="btn btn-danger btn-card-icon">
                        <Trash2 />
                      </button>
                    )}
                  </div>

                  {isOwner(course) && (
                    <div className="course-card-actions__row">
                      <button
                        onClick={() => toggleShare(course)}
                        className={`btn btn-card-action ${course.shared ? 'btn-toggle-private' : 'btn-toggle-public'}`}
                      >
                        {course.shared
                          ? <><X /><span>Rendre Privé</span></>
                          : <><Share2 /><span>Rendre Public</span></>}
                      </button>
                      <button
                        onClick={() => generateShareLink(course)}
                        className="btn btn-link-share btn-card-icon"
                      >
                        <LinkIcon />
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ))
          )}
        </div>

        {/* Modal upload */}
        {showUploadModal && (
          <div className="modal-backdrop">
            <div className="modal-box">
              <div className="modal-header">
                <h2 className="modal-title--lg">Ajoute ton cours 📚</h2>
                <button
                  onClick={() => { setShowUploadModal(false); setUploadForm({ title: '', category: 'Autre', file: null }); }}
                  className="modal-close-btn"
                >
                  <X />
                </button>
              </div>
              <div className="modal-body space-y-5">
                <div>
                  <label className="form-label">Titre du cours ✨</label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    className="input-field"
                    placeholder="Ex: Cours de mathématiques"
                  />
                </div>
                <div>
                  <label className="form-label">Catégorie 🏷️</label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                    className="input-field input-field--select input-field--select-full"
                  >
                    {categories.filter(cat => cat !== 'Toutes').map(cat => (
                      <option key={cat} value={cat}>{getCategoryIcon(cat)} {cat}</option>
                    ))}
                  </select>
                </div>
                <div className="modal-upload-file-info">
                  <p className="modal-upload-file-info__name">📄 <strong>Fichier :</strong> {uploadForm.file?.name}</p>
                  <p className="modal-upload-file-info__size">💾 {uploadForm.file && formatFileSize(uploadForm.file.size)}</p>
                </div>
                <button
                  onClick={handleFileUpload}
                  disabled={uploadProgress || !uploadForm.title}
                  className="btn btn-primary btn-full"
                >
                  {uploadProgress
                    ? <><div className="spinner" />Téléchargement...</>
                    : <><Upload />&nbsp;Ajouter le cours&nbsp;<Zap /></>
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal lien de partage */}
        {showShareModal && (
          <div className="modal-backdrop">
            <div className="modal-box">
              <div className="modal-header">
                <h2 className="modal-title--lg">Lien de partage 🔗</h2>
                <button
                  onClick={() => { setShowShareModal(false); setShareLink(''); setCopiedLink(false); setCurrentShareCourse(null); }}
                  className="modal-close-btn"
                >
                  <X />
                </button>
              </div>
              <div className="modal-body">
                <div className="modal-share-intro">
                  <p className="modal-share-intro__text">Partage ce lien avec tes potes ! 🎉</p>
                  <p className="modal-share-intro__course">📚 <strong>{currentShareCourse?.title}</strong></p>
                </div>
                <div className="modal-share-link-box">
                  <p className="modal-share-link-box__url">{shareLink}</p>
                </div>
                <div className="modal-share-actions">
                  <button onClick={copyToClipboard} className="btn btn-primary flex-1">
                    {copiedLink
                      ? <><span>✓</span>&nbsp;Copié !</>
                      : <><Copy />&nbsp;Copier le lien</>}
                  </button>
                  <button onClick={revokeShareLink} className="btn btn-danger btn-sm" title="Révoquer le lien">
                    <X />
                  </button>
                </div>
                <p className="modal-share-notice">
                  🌍 Les personnes avec ce lien pourront voir et télécharger le cours sans compte
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal commentaires */}
        {showComments && currentCourseForComments && (
          <div className="modal-backdrop">
            <div className="modal-box-lg">
              <div className="modal-header">
                <div className="modal-header__info">
                  <h2 className="modal-title">Commentaires & Évaluations 💬</h2>
                  <p className="modal-header__course-title">{currentCourseForComments.title}</p>
                </div>
                <button
                  onClick={() => { setShowComments(false); setCurrentCourseForComments(null); setComments([]); setNewComment(''); setNewRating(0); }}
                  className="modal-close-btn"
                >
                  <X />
                </button>
              </div>
              <div className="modal-body--scroll">

                <div className="alert-info comment-add-section">
                  <h3 className="comment-add-section__title">Ajouter une évaluation ⭐</h3>
                  <div className="comment-add-section__rating">
                    <label className="form-label">Ta note</label>
                    {renderStars(newRating, true, setNewRating)}
                  </div>
                  <div className="comment-add-section__text">
                    <label className="form-label">Ton commentaire</label>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="input-field input-field--textarea"
                      rows="3"
                      placeholder="Partage ton avis..."
                    />
                  </div>
                  <button onClick={submitComment} className="btn btn-primary btn-submit-comment">
                    Publier 🚀
                  </button>
                </div>

                <div className="comments-list">
                  <h3 className="comments-list__title">Tous les commentaires ({comments.length})</h3>
                  {comments.length === 0 ? (
                    <div className="comment-empty">
                      <MessageSquare className="text-gray-300" />
                      <p className="comment-empty__text">Aucun commentaire pour le moment</p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment._id} className="comment-card">
                        <div className="comment-card__header">
                          <div className="comment-card__header-left">
                            <div className="badge-user"><span>{comment.user.username}</span></div>
                            {comment.rating && renderStars(comment.rating)}
                          </div>
                          {comment.user._id === user?.id && (
                            <button onClick={() => deleteComment(comment._id)} className="btn-comment-delete">
                              <Trash2 />
                            </button>
                          )}
                        </div>
                        <p className="comment-card__text">{comment.text}</p>
                        <p className="comment-card__date">{formatDate(comment.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal visionneuse PDF */}
        {selectedCourse && (
          <div className="modal-backdrop">
            <div className="modal-box-xl">
              <div className="modal-header">
                <div>
                  <h2 className="modal-header__pdf-title">{selectedCourse.title}</h2>
                  <p className="modal-header__pdf-author">Par {selectedCourse.owner.username}</p>
                </div>
                <div className="modal-header__actions">
                  <a
                    href={resolvePdfUrl(selectedCourse.filePath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-success btn-sm"
                  >
                    <Download />&nbsp;Ouvrir
                  </a>
                  <button onClick={() => setSelectedCourse(null)} className="modal-close-btn">
                    <X />
                  </button>
                </div>
              </div>
              <div className="modal-body--scroll">
                <div className="pdf-modal-body">
                  <iframe
                    src={getPdfViewerUrl(selectedCourse.filePath)}
                    className="pdf-viewer"
                    title={selectedCourse.title}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}