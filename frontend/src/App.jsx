import React, { useState, useEffect } from 'react';
import { Upload, FileText, Share2, Download, Trash2, Search, Eye, LogOut, User, Lock, Mail, X, Copy, Link as LinkIcon, ArrowLeft, TrendingUp, Clock, Download as DownloadIcon, Star, Users, Award, BookOpen, Sparkles, Zap, Heart, MessageSquare } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';
const BASE_URL = 'http://localhost:5000';

export default function CourseShareApp() {
  // États d'authentification
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [authMode, setAuthMode] = useState('login');

  // États de l'application
  const [activeTab, setActiveTab] = useState('my-courses');
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [categoryFilter, setCategoryFilter] = useState('Toutes');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [loading, setLoading] = useState(false);

  // États pour le modal d'upload
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', category: 'Autre', file: null });

  // États pour les favoris
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);

  // États pour les commentaires et évaluations
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(0);
  const [currentCourseForComments, setCurrentCourseForComments] = useState(null);

  // Liste des catégories
  const categories = [
    'Toutes', 'Mathématiques', 'Physique', 'Chimie', 'Informatique',
    'Histoire', 'Géographie', 'Philosophie', 'Langues', 'Économie',
    'Droit', 'Médecine', 'Biologie', 'Littérature', 'Arts', 'Sport', 'Autre'
  ];

  // États pour le partage de lien
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentShareCourse, setCurrentShareCourse] = useState(null);

  // États pour la page publique
  const [isPublicView, setIsPublicView] = useState(false);
  const [publicCourse, setPublicCourse] = useState(null);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState(null);

  // Formulaire d'authentification
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });

  // ─── NOUVEAU : États pour mot de passe oublié / réinitialisation ───────────
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
  const [resetTokenValid, setResetTokenValid] = useState(null); // null=checking, true=valid, false=invalid
  const [resetUsername, setResetUsername] = useState('');
  const [resetSecondsLeft, setResetSecondsLeft] = useState(null);
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const path = window.location.pathname;
    const shareMatch = path.match(/^\/share\/([a-f0-9]+)$/);
    // ─── NOUVEAU : détecter la route /reset-password/:token ───────────────
    const resetMatch = path.match(/^\/reset-password\/([a-f0-9]+)$/);
    // ─────────────────────────────────────────────────────────────────────

    if (shareMatch) {
      const token = shareMatch[1];
      setIsPublicView(true);
      loadPublicCourse(token);
    } else if (resetMatch) {
      // ─── NOUVEAU : afficher le formulaire de réinitialisation ─────────
      const token = resetMatch[1];
      setResetToken(token);
      setShowResetModal(true);
      setShowAuthModal(false);
      verifyResetToken(token);
      // ──────────────────────────────────────────────────────────────────
    } else {
      const token    = localStorage.getItem('token');
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
    if (isAuthenticated && !isPublicView) {
      loadCourses(activeTab);
    }
  }, [activeTab, sortBy, categoryFilter]);

  // ─── NOUVEAU : Compte à rebours pour le token de reset ─────────────────
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
  // ────────────────────────────────────────────────────────────────────────

  const loadPublicCourse = async (token) => {
    setPublicLoading(true);
    setPublicError(null);
    try {
      const response = await fetch(`${API_URL}/courses/share/${token}`);
      if (!response.ok) throw new Error('Cours non trouvé ou lien invalide');
      const data = await response.json();
      setPublicCourse(data);
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
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Erreur lors du téléchargement');
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // ─── NOUVEAU : Fonctions mot de passe oublié / réinitialisation ──
  // ═══════════════════════════════════════════════════════════════════

  /** Vérifie si le token de reset est valide avant d'afficher le formulaire */
  const verifyResetToken = async (token) => {
    setResetTokenValid(null);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password/${token}`);
      const data     = await response.json();
      if (!response.ok) {
        setResetTokenValid(false);
        setResetError(data.error || 'Lien invalide ou expiré.');
      } else {
        setResetTokenValid(true);
        setResetUsername(data.username);
        setResetSecondsLeft(data.secondsLeft);
      }
    } catch (error) {
      setResetTokenValid(false);
      setResetError('Erreur de connexion au serveur.');
    }
  };

  /** Soumet la demande "mot de passe oublié" */
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotMessage('');
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: forgotEmail })
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

  /** Soumet le nouveau mot de passe */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetMessage('');
    try {
      const response = await fetch(`${API_URL}/auth/reset-password/${resetToken}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password: resetForm.password, confirmPassword: resetForm.confirmPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur serveur');
      setResetMessage(data.message);
      // Redirige vers la page de login après 2 secondes
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

  /** Formate mm:ss à partir des secondes restantes */
  const formatCountdown = (seconds) => {
    if (seconds === null) return '';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  // ═══════════════════════════════════════════════════════════════════

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const body     = authMode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : { username: authForm.username, email: authForm.email, password: authForm.password };

      if (authMode === 'register' && authForm.password !== authForm.confirmPassword) {
        alert('Les mots de passe ne correspondent pas');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body)
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
      const token  = localStorage.getItem('token');
      let endpoint = '';
      let params   = new URLSearchParams();

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

      const url      = `${API_URL}${endpoint}${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });

      if (!response.ok) throw new Error('Erreur lors du chargement des cours');
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      alert('Erreur lors du chargement des cours');
    }
  };

  // Fonctions pour les favoris
  const loadFavorites = async () => {
    try {
      const token    = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/favorites`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Erreur lors du chargement des favoris');
      const data = await response.json();
      setFavorites(data);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const toggleFavorite = async (courseId) => {
    try {
      const token      = localStorage.getItem('token');
      const isFav      = favorites.some(fav => fav._id === courseId);
      const response   = await fetch(`${API_URL}/favorites/${courseId}`, {
        method:  isFav ? 'DELETE' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Erreur lors de la gestion des favoris');
      await loadFavorites();
      await loadCourses();
    } catch (error) {
      alert('Erreur lors de la gestion des favoris');
    }
  };

  const isFavorite = (courseId) => favorites.some(fav => fav._id === courseId);

  // Fonctions pour les commentaires et évaluations
  const loadComments = async (courseId) => {
    try {
      const response = await fetch(`${API_URL}/courses/${courseId}/comments`);
      if (!response.ok) throw new Error('Erreur lors du chargement des commentaires');
      const data = await response.json();
      setComments(data);
    } catch (error) {
      console.error('Erreur:', error);
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
      const token    = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/courses/${currentCourseForComments._id}/comments`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify({ text: newComment, rating: newRating > 0 ? newRating : null })
      });
      if (!response.ok) throw new Error("Erreur lors de l'ajout du commentaire");
      setNewComment('');
      setNewRating(0);
      await loadComments(currentCourseForComments._id);
      await loadCourses();
    } catch (error) {
      alert("Erreur lors de l'ajout du commentaire");
    }
  };

  const deleteComment = async (commentId) => {
    if (!confirm('Voulez-vous vraiment supprimer ce commentaire ?')) return;
    try {
      const token    = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/comments/${commentId}`, {
        method:  'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Erreur lors de la suppression du commentaire');
      await loadComments(currentCourseForComments._id);
      await loadCourses();
    } catch (error) {
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
    setUploadForm({ ...uploadForm, file: file, title: file.name.replace('.pdf', '') });
    setShowUploadModal(true);
    event.target.value = '';
  };

  const handleFileUpload = async () => {
    if (!uploadForm.file) return;
    setUploadProgress(true);
    try {
      const formData = new FormData();
      formData.append('file',     uploadForm.file);
      formData.append('title',    uploadForm.title);
      formData.append('category', uploadForm.category);
      formData.append('shared',   'false');

      const token    = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/courses`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body:    formData
      });
      if (!response.ok) throw new Error("Erreur lors de l'upload");
      await loadCourses();
      setShowUploadModal(false);
      setUploadForm({ title: '', category: 'Autre', file: null });
      alert('Cours ajouté avec succès !');
    } catch (error) {
      alert("Erreur lors de l'upload du fichier");
    } finally {
      setUploadProgress(false);
    }
  };

  const toggleShare = async (course) => {
    try {
      const token    = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/courses/${course._id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify({ shared: !course.shared })
      });
      if (!response.ok) throw new Error('Erreur lors du partage');
      await loadCourses();
    } catch (error) {
      alert('Erreur lors du partage du cours');
    }
  };

  const generateShareLink = async (course) => {
    try {
      const token    = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/courses/${course._id}/share-link`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Erreur lors de la génération du lien');
      const data = await response.json();
      setShareLink(`${window.location.origin}/share/${data.shareToken}`);
      setCurrentShareCourse(course);
      setShowShareModal(true);
      await loadCourses();
    } catch (error) {
      alert('Erreur lors de la génération du lien de partage');
    }
  };

  const revokeShareLink = async () => {
    if (!currentShareCourse) return;
    if (!confirm('Voulez-vous vraiment révoquer ce lien de partage ?')) return;
    try {
      const token    = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/courses/${currentShareCourse._id}/share-link`, {
        method:  'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Erreur lors de la révocation du lien');
      setShowShareModal(false);
      setShareLink('');
      setCurrentShareCourse(null);
      await loadCourses();
      alert('Lien de partage révoqué avec succès');
    } catch (error) {
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
      const token    = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/courses/${courseId}`, {
        method:  'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Erreur lors de la suppression');
      await loadCourses();
      if (selectedCourse?._id === courseId) setSelectedCourse(null);
    } catch (error) {
      alert('Erreur lors de la suppression du cours');
    }
  };

  const downloadPDF = async (courseId, fileName) => {
    try {
      const token    = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/courses/${courseId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Erreur lors du téléchargement');
      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Erreur lors du téléchargement');
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setTimeout(() => loadCourses(), 300);
  };

  const filteredCourses = courses;

  const formatFileSize = (bytes) => {
    if (bytes < 1024)          return bytes + ' B';
    if (bytes < 1024 * 1024)   return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (isoDate) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const isOwner = (course) => course.owner._id === user?.id || course.owner === user?.id;

  const getCategoryColor = (category) => {
    const colors = {
      'Mathématiques': 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white',
      'Physique':      'bg-gradient-to-br from-cyan-500 to-teal-500 text-white',
      'Chimie':        'bg-gradient-to-br from-green-500 to-emerald-500 text-white',
      'Informatique':  'bg-gradient-to-br from-purple-500 to-violet-500 text-white',
      'Histoire':      'bg-gradient-to-br from-amber-500 to-orange-500 text-white',
      'Géographie':    'bg-gradient-to-br from-teal-500 to-cyan-500 text-white',
      'Philosophie':   'bg-gradient-to-br from-indigo-500 to-purple-500 text-white',
      'Langues':       'bg-gradient-to-br from-pink-500 to-rose-500 text-white',
      'Économie':      'bg-gradient-to-br from-yellow-500 to-amber-500 text-white',
      'Droit':         'bg-gradient-to-br from-red-500 to-rose-500 text-white',
      'Médecine':      'bg-gradient-to-br from-rose-500 to-pink-500 text-white',
      'Biologie':      'bg-gradient-to-br from-lime-500 to-green-500 text-white',
      'Littérature':   'bg-gradient-to-br from-violet-500 to-purple-500 text-white',
      'Arts':          'bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white',
      'Sport':         'bg-gradient-to-br from-orange-500 to-red-500 text-white',
      'Autre':         'bg-gradient-to-br from-gray-500 to-slate-500 text-white'
    };
    return colors[category] || colors['Autre'];
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Mathématiques': '📐', 'Physique': '⚛️',  'Chimie': '🧪',
      'Informatique':  '💻', 'Histoire': '📜',   'Géographie': '🌍',
      'Philosophie':   '🤔', 'Langues':  '🗣️',  'Économie': '💰',
      'Droit':         '⚖️', 'Médecine': '🏥',  'Biologie': '🧬',
      'Littérature':   '📚', 'Arts':     '🎨',   'Sport': '⚽',
      'Autre':         '📄'
    };
    return icons[category] || '📄';
  };

  const renderStars = (rating, interactive = false, onRate = null) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-5 h-5 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          onClick={() => interactive && onRate && onRate(star)}
        />
      ))}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════
  // Vue publique pour les liens partagés
  // ═══════════════════════════════════════════════════════════════════

  if (isPublicView) {
    if (publicLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
              <Sparkles className="w-10 h-10 text-yellow-300 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-white text-xl font-semibold animate-pulse">Chargement du cours...</p>
          </div>
        </div>
      );
    }

    if (publicError || !publicCourse) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center transform hover:scale-105 transition-transform">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-full mb-6 shadow-lg">
              <X className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-black text-gray-800 mb-3 bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">Oups ! 😕</h2>
            <p className="text-gray-600 mb-8 text-lg">{publicError || 'Le lien de partage est invalide ou a été révoqué.'}</p>
            <button onClick={() => window.location.href = '/'} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center gap-2 mx-auto">
              <ArrowLeft className="w-5 h-5" />Retour à l'accueil
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white rounded-3xl shadow-2xl p-6 mb-8 transform hover:scale-[1.02] transition-transform">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-4 rounded-2xl shadow-lg">
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Papyrus 📚</h1>
                  <p className="text-purple-600 font-semibold">Cours partagé avec amour ❤️</p>
                </div>
              </div>
              <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 px-6 py-3 rounded-2xl hover:from-gray-200 hover:to-gray-300 transition-all font-semibold shadow-lg hover:shadow-xl">
                <ArrowLeft className="w-5 h-5" />Accueil
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6 transform hover:scale-[1.01] transition-transform">
            <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-5xl">{getCategoryIcon(publicCourse.category)}</span>
                  <h2 className="text-4xl font-black text-gray-800">{publicCourse.title}</h2>
                </div>
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-md">
                    <User className="w-4 h-4" />{publicCourse.owner.username}
                  </div>
                  <div className={`${getCategoryColor(publicCourse.category)} px-4 py-2 rounded-full font-bold shadow-md`}>{publicCourse.category || 'Autre'}</div>
                  {publicCourse.averageRating > 0 && (
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-md">
                      <Star className="w-4 h-4 fill-white" />{publicCourse.averageRating.toFixed(1)} ({publicCourse.ratingsCount})
                    </div>
                  )}
                </div>
                {publicCourse.description && <p className="text-gray-700 mb-4 text-lg">{publicCourse.description}</p>}
                <div className="flex items-center gap-6 text-sm text-gray-600 flex-wrap">
                  <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full"><FileText className="w-5 h-5 text-blue-600" /><span className="font-semibold">{formatFileSize(publicCourse.fileSize)}</span></div>
                  <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full"><Eye className="w-5 h-5 text-green-600" /><span className="font-semibold">{publicCourse.views} vues</span></div>
                  <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-full"><Download className="w-5 h-5 text-purple-600" /><span className="font-semibold">{publicCourse.downloads} téléchargements</span></div>
                  <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full"><Clock className="w-5 h-5 text-orange-600" /><span className="font-semibold">{formatDate(publicCourse.createdAt)}</span></div>
                </div>
              </div>
              <button onClick={() => downloadPublicPDF(publicCourse.shareToken, publicCourse.fileName)} className="flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl font-bold text-lg transform hover:-translate-y-1">
                <Download className="w-6 h-6" />Télécharger
              </button>
            </div>
            <div className="border-4 border-gray-200 rounded-3xl overflow-hidden bg-gray-100 shadow-inner">
              <iframe src={`${BASE_URL}/${publicCourse.filePath}`} className="w-full h-[800px] border-0" title={publicCourse.title} />
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-3xl shadow-2xl p-10 text-center text-white transform hover:scale-[1.02] transition-transform">
            <div className="flex justify-center mb-4"><Sparkles className="w-16 h-16 text-yellow-300 animate-bounce" /></div>
            <h3 className="text-4xl font-black mb-4">Tu kiffes ce contenu ? 🔥</h3>
            <p className="text-xl mb-8 text-purple-100">Rejoins la communauté Papyrus et partage tes propres cours ! C'est gratuit et ça prend 30 secondes ⚡</p>
            <button onClick={() => window.location.href = '/'} className="bg-white text-purple-600 px-10 py-5 rounded-2xl font-black text-lg hover:bg-gray-100 transition-all shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 inline-flex items-center gap-3">
              <Zap className="w-6 h-6" />Rejoindre Papyrus<Zap className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ─── NOUVEAU : Page de réinitialisation du mot de passe ──────────
  // ═══════════════════════════════════════════════════════════════════

  if (showResetModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md transform hover:scale-[1.02] transition-transform">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl mb-6 shadow-xl">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Papyrus 📚</h1>
            <p className="text-gray-600 text-lg font-semibold">Nouveau mot de passe 🔒</p>
          </div>

          {/* Vérification du token en cours */}
          {resetTokenValid === null && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-semibold">Vérification du lien...</p>
            </div>
          )}

          {/* Token invalide */}
          {resetTokenValid === false && (
            <div className="text-center">
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
                <p className="text-red-700 font-bold text-lg mb-2">❌ Lien invalide ou expiré</p>
                <p className="text-red-600 text-sm">{resetError}</p>
              </div>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setShowForgotModal(true);
                  window.history.pushState({}, '', '/');
                }}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-black text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Refaire une demande 🔄
              </button>
            </div>
          )}

          {/* Token valide → formulaire */}
          {resetTokenValid === true && !resetMessage && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {resetUsername && (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 text-center">
                  <p className="text-purple-700 font-bold">Salut <span className="text-purple-900">{resetUsername}</span> ! 👋</p>
                  <p className="text-purple-600 text-sm mt-1">Choisis un nouveau mot de passe</p>
                  {resetSecondsLeft !== null && resetSecondsLeft > 0 && (
                    <p className="text-orange-600 font-black text-sm mt-2">
                      ⏱️ Expire dans : <span className="font-mono text-lg">{formatCountdown(resetSecondsLeft)}</span>
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nouveau mot de passe 🔑</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-500 w-5 h-5" />
                  <input
                    type="password"
                    value={resetForm.password}
                    onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-500 font-semibold transition-all"
                    placeholder="Au moins 6 caractères"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Confirme le mot de passe 🔐</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-500 w-5 h-5" />
                  <input
                    type="password"
                    value={resetForm.confirmPassword}
                    onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-500 font-semibold transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {resetError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                  <p className="text-red-700 font-semibold text-sm">❌ {resetError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-5 rounded-2xl font-black text-lg hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {resetLoading ? (
                  <><div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>En cours...</>
                ) : (
                  <><Zap className="w-5 h-5" />Changer le mot de passe<Zap className="w-5 h-5" /></>
                )}
              </button>
            </form>
          )}

          {/* Succès */}
          {resetMessage && (
            <div className="text-center">
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 mb-6">
                <p className="text-green-700 font-black text-xl mb-2">✅ Succès !</p>
                <p className="text-green-600 font-semibold">{resetMessage}</p>
                <p className="text-gray-500 text-sm mt-2">Redirection vers la connexion...</p>
              </div>
              <div className="w-8 h-8 border-4 border-green-300 border-t-green-600 rounded-full animate-spin mx-auto"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // Modal d'authentification (login / register)
  // ═══════════════════════════════════════════════════════════════════

  if (showAuthModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md transform hover:scale-[1.02] transition-transform">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl mb-6 shadow-xl transform hover:rotate-6 transition-transform">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-black mb-3 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Papyrus 📚</h1>
            <p className="text-gray-600 text-lg font-semibold">
              {authMode === 'login' ? 'Bon retour parmi nous ! 👋' : 'Rejoins la communauté ! 🚀'}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Nom d'utilisateur ✨</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-500 w-5 h-5" />
                  <input type="text" value={authForm.username} onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-500 font-semibold transition-all"
                    placeholder="ton_super_pseudo" required />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email 📧</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-500 w-5 h-5" />
                <input type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-500 font-semibold transition-all"
                  placeholder="email@exemple.com" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Mot de passe 🔒</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-500 w-5 h-5" />
                <input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-500 font-semibold transition-all"
                  placeholder="••••••••" required />
              </div>
            </div>

            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Confirme ton mot de passe 🔐</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-500 w-5 h-5" />
                  <input type="password" value={authForm.confirmPassword} onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-500 font-semibold transition-all"
                    placeholder="••••••••" required />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-5 rounded-2xl font-black text-lg hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>Chargement...</>
              ) : (
                <><Zap className="w-5 h-5" />{authMode === 'login' ? 'Se connecter' : "S'inscrire"}<Zap className="w-5 h-5" /></>
              )}
            </button>
          </form>

          {/* ─── NOUVEAU : Lien "Mot de passe oublié" ── */}
          {authMode === 'login' && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowForgotModal(true)}
                className="text-gray-500 hover:text-purple-600 transition-colors font-semibold text-sm hover:underline"
              >
                Mot de passe oublié ? 🤔
              </button>
            </div>
          )}
          {/* ──────────────────────────────────────────── */}

          <div className="mt-6 text-center">
            <button
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthForm({ username: '', email: '', password: '', confirmPassword: '' }); }}
              className="text-purple-600 hover:text-purple-800 transition-colors font-bold text-lg hover:underline"
            >
              {authMode === 'login' ? "Pas encore de compte ? Inscris-toi ! 🎉" : 'Déjà un compte ? Connecte-toi ! 👍'}
            </button>
          </div>
        </div>

        {/* ─── NOUVEAU : Modal "Mot de passe oublié" ─────────────────────── */}
        {showForgotModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-gray-800">Mot de passe oublié 🔑</h2>
                <button
                  onClick={() => { setShowForgotModal(false); setForgotEmail(''); setForgotMessage(''); setForgotError(''); }}
                  className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-2xl p-2 transition-all"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>

              {!forgotMessage ? (
                <>
                  <p className="text-gray-600 mb-6 font-semibold">
                    Saisis ton email et on t'envoie un lien de réinitialisation valable <strong>7 minutes</strong> ! ⏱️
                  </p>
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Ton email 📧</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-500 w-5 h-5" />
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-300 focus:border-purple-500 font-semibold transition-all"
                          placeholder="email@exemple.com"
                          required
                        />
                      </div>
                    </div>

                    {forgotError && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
                        <p className="text-red-700 font-semibold text-sm">❌ {forgotError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-5 rounded-2xl font-black text-lg hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      {forgotLoading ? (
                        <><div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>Envoi en cours...</>
                      ) : (
                        <><Mail className="w-5 h-5" />Envoyer le lien<Zap className="w-5 h-5" /></>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                /* Message de succès */
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full mb-6 shadow-lg">
                    <Mail className="w-10 h-10 text-white" />
                  </div>
                  <p className="text-gray-800 font-black text-xl mb-3">Email envoyé ! 📬</p>
                  <p className="text-gray-600 font-semibold mb-6">{forgotMessage}</p>
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 mb-6">
                    <p className="text-yellow-800 font-bold text-sm">⏱️ N'oublie pas : le lien expire dans <strong>7 minutes</strong> !</p>
                  </div>
                  <button
                    onClick={() => { setShowForgotModal(false); setForgotEmail(''); setForgotMessage(''); setForgotError(''); }}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-black hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    Retour à la connexion 👍
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {/* ──────────────────────────────────────────────────────────────────── */}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // Application principale (utilisateur connecté)
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-6 transform hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-4 rounded-2xl shadow-lg transform hover:rotate-12 transition-transform">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Papyrus 📚</h1>
                <p className="text-purple-600 font-bold">Ta bibliothèque de connaissances</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setShowFavorites(!showFavorites)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all ${showFavorites ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white' : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800'}`}>
                <Heart className={`w-5 h-5 ${showFavorites ? 'fill-white' : ''}`} />Favoris ({favorites.length})
              </button>
              <div className="text-right bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-3 rounded-2xl">
                <p className="text-sm text-purple-600 font-semibold">Connecté en tant que</p>
                <p className="font-black text-purple-800 text-lg">{user?.username} 👤</p>
              </div>
              <button onClick={handleLogout}
                className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-2xl hover:from-red-600 hover:to-pink-600 transition-all font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                <LogOut className="w-5 h-5" />Déconnexion
              </button>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-3xl shadow-xl p-3 mb-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'my-courses', icon: <FileText className="w-6 h-6" />, label: 'Mes Cours' },
              { key: 'discover',   icon: <Search className="w-6 h-6" />,   label: 'Découvrir' },
              { key: 'shared',     icon: <Share2 className="w-6 h-6" />,   label: 'Partagés' }
            ].map(({ key, icon, label }) => (
              <button key={key} onClick={() => { setActiveTab(key); setShowFavorites(false); }}
                className={`py-4 px-6 rounded-2xl font-black transition-all transform hover:-translate-y-1 ${activeTab === key ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                <div className="flex items-center justify-center gap-2 text-lg">{icon}{label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Upload Section */}
        {activeTab === 'my-courses' && !showFavorites && (
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-6 transform hover:scale-[1.01] transition-transform">
            <label className="flex flex-col items-center justify-center border-4 border-dashed border-purple-300 rounded-3xl p-12 cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all group">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-6 rounded-3xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                <Upload className="w-12 h-12 text-white" />
              </div>
              <span className="text-2xl font-black text-gray-800 mb-2">Ajoute ton PDF ici ! 📄</span>
              <span className="text-lg text-gray-500 font-semibold">Taille max: 10 Mo · Formats: PDF uniquement</span>
              <input type="file" accept=".pdf,application/pdf" onChange={handleFileSelect} className="hidden" />
            </label>
          </div>
        )}

        {/* Search and Sort Bar */}
        {!showFavorites && (
          <div className="bg-white rounded-3xl shadow-xl p-5 mb-6">
            <div className="flex gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-500 w-6 h-6" />
                <input type="text" placeholder="Cherche un cours... 🔍" value={searchTerm} onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-14 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:ring-4 focus:ring-purple-300 focus:border-purple-500 outline-none font-semibold text-lg transition-all" />
              </div>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 focus:ring-4 focus:ring-purple-300 outline-none cursor-pointer font-bold text-lg transition-all">
                {categories.map(cat => <option key={cat} value={cat}>{getCategoryIcon(cat)} {cat}</option>)}
              </select>
              {activeTab === 'discover' && (
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  className="px-6 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 focus:ring-4 focus:ring-purple-300 outline-none cursor-pointer font-bold text-lg transition-all">
                  <option value="recent">🆕 Plus récents</option>
                  <option value="popular">🔥 Plus populaires</option>
                  <option value="downloads">⬇️ Plus téléchargés</option>
                  <option value="rating">⭐ Mieux notés</option>
                </select>
              )}
            </div>
          </div>
        )}

        {/* Course Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(showFavorites ? favorites : filteredCourses).length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white rounded-3xl shadow-xl">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-6 shadow-lg">
                {showFavorites ? <Heart className="w-12 h-12 text-white" /> : <FileText className="w-12 h-12 text-white" />}
              </div>
              <p className="text-gray-600 text-2xl font-bold">
                {showFavorites ? 'Aucun cours favori pour le moment ! ❤️'
                  : searchTerm ? 'Aucun cours trouvé 😕'
                  : activeTab === 'my-courses' ? 'Aucun cours pour le moment ! Ajoute ton premier cours 🚀'
                  : activeTab === 'discover' ? 'Aucun cours public disponible 📚'
                  : 'Aucun cours partagé avec toi 💌'}
              </p>
            </div>
          ) : (
            (showFavorites ? favorites : filteredCourses).map((course) => (
              <div key={course._id} className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all p-6 group hover:-translate-y-2 transform">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-3xl">{getCategoryIcon(course.category)}</span>
                      <h3 className="text-xl font-black text-gray-800 group-hover:text-purple-600 transition-colors line-clamp-2">{course.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                        <User className="w-3 h-3" />{course.owner.username}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(course._id); }}
                        className={`p-2 rounded-full transition-all ${isFavorite(course._id) ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                        <Heart className={`w-4 h-4 ${isFavorite(course._id) ? 'fill-white' : ''}`} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`${getCategoryColor(course.category)} px-3 py-1 rounded-full text-xs font-bold shadow-md`}>{course.category || 'Autre'}</span>
                    </div>
                    {course.averageRating > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        {renderStars(Math.round(course.averageRating))}
                        <span className="text-sm font-bold text-gray-700">{course.averageRating.toFixed(1)} ({course.ratingsCount})</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-600 font-semibold">
                      <span className="bg-blue-50 px-2 py-1 rounded-lg">{formatFileSize(course.fileSize)}</span>
                      <span>•</span>
                      <span className="bg-orange-50 px-2 py-1 rounded-lg">{formatDate(course.createdAt)}</span>
                    </div>
                  </div>
                  <div className={`px-3 py-2 rounded-full text-xs font-black shadow-md ${course.shared ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'}`}>
                    {course.shared ? '🌍 Public' : '🔒 Privé'}
                  </div>
                </div>

                {course.shareToken && isOwner(course) && (
                  <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-blue-700 font-bold">🔗 Lien actif</span>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm text-gray-600 mb-4 font-semibold">
                  <div className="flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full"><Eye className="w-4 h-4 text-green-600" /><span>{course.views}</span></div>
                  <div className="flex items-center gap-1 bg-purple-50 px-3 py-1 rounded-full"><Download className="w-4 h-4 text-purple-600" /><span>{course.downloads}</span></div>
                  <button onClick={(e) => { e.stopPropagation(); openComments(course); }}
                    className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors">
                    <MessageSquare className="w-4 h-4 text-blue-600" /><span>Commentaires</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedCourse(course)}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-bold transform hover:-translate-y-1">
                      <Eye className="w-5 h-5" />Voir
                    </button>
                    <button onClick={() => downloadPDF(course._id, course.fileName)}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-2xl hover:from-green-600 hover:to-emerald-600 transition-all font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                      <Download className="w-5 h-5" />
                    </button>
                    {isOwner(course) && (
                      <button onClick={() => deleteCourse(course._id)}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-3 rounded-2xl hover:from-red-600 hover:to-pink-600 transition-all font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {isOwner(course) && (
                    <div className="flex gap-2">
                      <button onClick={() => toggleShare(course)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl transition-all font-black shadow-md hover:shadow-lg transform hover:-translate-y-1 ${course.shared ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'}`}>
                        {course.shared ? <><X className="w-5 h-5" /><span>Rendre Privé</span></> : <><Share2 className="w-5 h-5" /><span>Rendre Public</span></>}
                      </button>
                      <button onClick={() => generateShareLink(course)}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all font-bold shadow-md hover:shadow-lg transform hover:-translate-y-1">
                        <LinkIcon className="w-5 h-5" /><span>Lien</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black text-gray-800">Ajoute ton cours 📚</h2>
                <button onClick={() => { setShowUploadModal(false); setUploadForm({ title: '', category: 'Autre', file: null }); }}
                  className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-2xl p-2 transition-all">
                  <X className="w-7 h-7" />
                </button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Titre du cours ✨</label>
                  <input type="text" value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:ring-4 focus:ring-purple-300 outline-none font-semibold transition-all"
                    placeholder="Ex: Cours de mathématiques" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Catégorie 🏷️</label>
                  <select value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-800 focus:ring-4 focus:ring-purple-300 outline-none cursor-pointer font-bold transition-all">
                    {categories.filter(cat => cat !== 'Toutes').map(cat => <option key={cat} value={cat}>{getCategoryIcon(cat)} {cat}</option>)}
                  </select>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-4">
                  <p className="text-sm text-gray-700 font-bold">📄 <strong>Fichier :</strong> {uploadForm.file?.name}</p>
                  <p className="text-xs text-gray-600 mt-2 font-semibold">💾 {uploadForm.file && formatFileSize(uploadForm.file.size)}</p>
                </div>
                <button onClick={handleFileUpload} disabled={uploadProgress || !uploadForm.title}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-5 rounded-2xl font-black text-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-3 transform hover:-translate-y-1">
                  {uploadProgress ? (
                    <><div className="animate-spin rounded-full h-6 w-6 border-3 border-white/30 border-t-white"></div>Téléchargement...</>
                  ) : (
                    <><Upload className="w-6 h-6" />Ajouter le cours<Zap className="w-6 h-6" /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Link Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black text-gray-800">Lien de partage 🔗</h2>
                <button onClick={() => { setShowShareModal(false); setShareLink(''); setCopiedLink(false); setCurrentShareCourse(null); }}
                  className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-2xl p-2 transition-all">
                  <X className="w-7 h-7" />
                </button>
              </div>
              <div className="mb-6">
                <p className="text-gray-600 mb-3 font-semibold text-lg">Partage ce lien avec tes potes ! 🎉</p>
                <p className="text-sm text-gray-500 mb-4 font-semibold">📚 <strong>{currentShareCourse?.title}</strong></p>
              </div>
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-2xl p-4 mb-6">
                <p className="text-sm text-gray-700 break-all font-mono font-semibold">{shareLink}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={copyToClipboard}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-black hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                  {copiedLink ? <><span className="text-xl">✓</span>Copié !</> : <><Copy className="w-5 h-5" />Copier le lien</>}
                </button>
                <button onClick={revokeShareLink}
                  className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-4 rounded-2xl font-black hover:from-red-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1" title="Révoquer le lien">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-6 text-center font-semibold">🌍 Les personnes avec ce lien pourront voir et télécharger le cours sans compte</p>
            </div>
          </div>
        )}

        {/* Comments Modal */}
        {showComments && currentCourseForComments && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b-2 border-gray-200">
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-gray-800">Commentaires & Évaluations 💬</h2>
                  <p className="text-sm text-purple-600 font-bold">{currentCourseForComments.title}</p>
                </div>
                <button onClick={() => { setShowComments(false); setCurrentCourseForComments(null); setComments([]); setNewComment(''); setNewRating(0); }}
                  className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-2xl p-3 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-6 border-2 border-purple-200">
                  <h3 className="font-black text-gray-800 mb-4 text-lg">Ajouter une évaluation ⭐</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Ta note</label>
                    {renderStars(newRating, true, setNewRating)}
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Ton commentaire</label>
                    <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:ring-4 focus:ring-purple-300 outline-none font-semibold resize-none transition-all"
                      rows="3" placeholder="Partage ton avis..." />
                  </div>
                  <button onClick={submitComment}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-2xl font-black hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                    Publier 🚀
                  </button>
                </div>
                <div className="space-y-4">
                  <h3 className="font-black text-gray-800 text-lg mb-4">Tous les commentaires ({comments.length})</h3>
                  {comments.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl">
                      <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 font-semibold">Aucun commentaire pour le moment</p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment._id} className="bg-white border-2 border-gray-200 rounded-2xl p-4 hover:border-purple-300 transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full font-bold text-sm">{comment.user.username}</div>
                            {comment.rating && renderStars(comment.rating)}
                          </div>
                          {comment.user._id === user?.id && (
                            <button onClick={() => deleteComment(comment._id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-xl transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-gray-700 font-semibold mb-2">{comment.text}</p>
                        <p className="text-xs text-gray-500 font-semibold">{formatDate(comment.createdAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PDF Viewer Modal */}
        {selectedCourse && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b-2 border-gray-200">
                <div>
                  <h2 className="text-3xl font-black text-gray-800">{selectedCourse.title}</h2>
                  <p className="text-lg text-purple-600 font-bold">Par {selectedCourse.owner.username}</p>
                </div>
                <button onClick={() => setSelectedCourse(null)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-2xl p-3 transition-all">
                  <X className="w-7 h-7" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <div className="bg-gray-100 rounded-3xl overflow-hidden shadow-inner">
                  <iframe src={`${BASE_URL}/${selectedCourse.filePath}`} className="w-full h-full min-h-[700px] border-0" title={selectedCourse.title} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}