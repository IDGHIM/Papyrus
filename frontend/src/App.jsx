import React, { useState, useEffect } from 'react';
import { Upload, FileText, Share2, Download, Trash2, Search, Eye, LogOut, User, Lock, Mail, X, Copy, Link as LinkIcon, ArrowLeft, TrendingUp, Clock, Download as DownloadIcon } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';
const BASE_URL = 'http://localhost:5000';

export default function CourseShareApp() {
  // États d'authentification
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  
  // États de l'application
  const [activeTab, setActiveTab] = useState('my-courses'); // 'my-courses', 'discover', 'shared'
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'popular', 'downloads'
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [loading, setLoading] = useState(false);

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
  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // Vérifier si on est sur une URL de partage public
    const path = window.location.pathname;
    const shareMatch = path.match(/^\/share\/([a-f0-9]+)$/);
    
    if (shareMatch) {
      const token = shareMatch[1];
      setIsPublicView(true);
      loadPublicCourse(token);
    } else {
      // Mode normal - vérifier l'authentification
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        setIsAuthenticated(true);
        setUser(JSON.parse(userData));
        setShowAuthModal(false);
        loadCourses('my-courses');
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !isPublicView) {
      loadCourses(activeTab);
    }
  }, [activeTab, sortBy]);

  const loadPublicCourse = async (token) => {
    setPublicLoading(true);
    setPublicError(null);

    try {
      const response = await fetch(`${API_URL}/courses/share/${token}`);

      if (!response.ok) {
        throw new Error('Cours non trouvé ou lien invalide');
      }

      const data = await response.json();
      setPublicCourse(data);
    } catch (error) {
      console.error('Erreur:', error);
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
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du téléchargement');
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const body = authMode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : { 
            username: authForm.username, 
            email: authForm.email, 
            password: authForm.password 
          };

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

      if (!response.ok) {
        throw new Error(data.error || 'Erreur d\'authentification');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setIsAuthenticated(true);
      setUser(data.user);
      setShowAuthModal(false);
      setAuthForm({ username: '', email: '', password: '', confirmPassword: '' });
      
      await loadCourses('my-courses');
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
    setShowAuthModal(true);
  };

  const loadCourses = async (tab = activeTab) => {
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      let params = new URLSearchParams();

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      switch (tab) {
        case 'my-courses':
          endpoint = '/courses/my-courses';
          break;
        case 'discover':
          endpoint = '/courses/public';
          params.append('sort', sortBy);
          break;
        case 'shared':
          endpoint = '/courses/shared-with-me';
          break;
        default:
          endpoint = '/courses';
      }

      const url = `${API_URL}${endpoint}${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erreur lors du chargement des cours');

      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du chargement des cours');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Veuillez sélectionner un fichier PDF');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Le fichier est trop volumineux. Taille maximale : 10 Mo');
      return;
    }

    setUploadProgress(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace('.pdf', ''));
      formData.append('shared', 'false');

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/courses`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) throw new Error('Erreur lors de l\'upload');

      await loadCourses();
      alert('Cours ajouté avec succès !');
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'upload du fichier');
    } finally {
      setUploadProgress(false);
      event.target.value = '';
    }
  };

  const toggleShare = async (course) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/courses/${course._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ shared: !course.shared })
      });

      if (!response.ok) throw new Error('Erreur lors du partage');

      await loadCourses();
    } catch (error) {
      console.error('Erreur:', error);
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

      if (!response.ok) throw new Error('Erreur lors de la génération du lien');

      const data = await response.json();
      setShareLink(`${window.location.origin}/share/${data.shareToken}`);
      setCurrentShareCourse(course);
      setShowShareModal(true);
      await loadCourses();
    } catch (error) {
      console.error('Erreur:', error);
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

      if (!response.ok) throw new Error('Erreur lors de la révocation du lien');

      setShowShareModal(false);
      setShareLink('');
      setCurrentShareCourse(null);
      await loadCourses();
      alert('Lien de partage révoqué avec succès');
    } catch (error) {
      console.error('Erreur:', error);
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

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      await loadCourses();
      if (selectedCourse?._id === courseId) {
        setSelectedCourse(null);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression du cours');
    }
  };

  const downloadPDF = async (courseId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/courses/${courseId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Erreur lors du téléchargement');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du téléchargement');
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setTimeout(() => loadCourses(), 300);
  };

  const filteredCourses = courses;

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (isoDate) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isOwner = (course) => course.owner._id === user?.id || course.owner === user?.id;

  // Vue publique pour les liens partagés
  if (isPublicView) {
    if (publicLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mb-4"></div>
            <p className="text-purple-200 text-lg">Chargement du cours...</p>
          </div>
        </div>
      );
    }

    if (publicError || !publicCourse) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-white/20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
              <X className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Cours introuvable</h2>
            <p className="text-purple-200 mb-6">
              {publicError || 'Le lien de partage est invalide ou a été révoqué.'}
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-[10px] opacity-30">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
          </div>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-8">
          {/* Header Public */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-6 mb-8 border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-2xl shadow-lg">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Papyrus
                  </h1>
                  <p className="text-purple-200">Cours partagé publiquement</p>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2 bg-white/10 backdrop-blur text-white px-4 py-2 rounded-xl hover:bg-white/20 transition-all border border-white/20"
              >
                <ArrowLeft className="w-4 h-4" />
                Accueil
              </button>
            </div>
          </div>

          {/* Course Details */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 mb-6 border border-white/20">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white mb-3">{publicCourse.title}</h2>
                <p className="text-purple-200 mb-4">
                  Partagé par <span className="font-semibold text-pink-400">{publicCourse.owner.username}</span>
                </p>
                {publicCourse.description && (
                  <p className="text-purple-200 mb-4">{publicCourse.description}</p>
                )}
                <div className="flex items-center gap-6 text-sm text-purple-300">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>{formatFileSize(publicCourse.fileSize)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>{publicCourse.views} vues</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    <span>{publicCourse.downloads} téléchargements</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{formatDate(publicCourse.createdAt)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => downloadPublicPDF(publicCourse.shareToken, publicCourse.fileName)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
              >
                <Download className="w-5 h-5" />
                Télécharger
              </button>
            </div>

            {/* PDF Viewer */}
            <div className="border-2 border-white/20 rounded-2xl overflow-hidden bg-white">
              <iframe
                src={`${BASE_URL}/${publicCourse.filePath}`}
                className="w-full h-[800px] border-0"
                title={publicCourse.title}
              />
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl shadow-2xl p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-3">Vous aimez ce contenu ?</h3>
            <p className="text-purple-100 mb-6">
              Créez votre compte gratuit pour partager vos propres cours avec la communauté !
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-white text-purple-600 px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-lg"
            >
              Rejoindre Papyrus
            </button>
          </div>
        </div>

        <style>{`
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}</style>
      </div>
    );
  }

  if (showAuthModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-[10px] opacity-50">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
          </div>
        </div>

        <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Papyrus
            </h1>
            <p className="text-purple-200">
              {authMode === 'login' ? 'Connectez-vous à votre compte' : 'Créez votre compte'}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Nom d'utilisateur
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5" />
                  <input
                    type="text"
                    value={authForm.username}
                    onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="votre_nom"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5" />
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="email@exemple.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5" />
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5" />
                  <input
                    type="password"
                    value={authForm.confirmPassword}
                    onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'Chargement...' : authMode === 'login' ? 'Se connecter' : 'S\'inscrire'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthForm({ username: '', email: '', password: '', confirmPassword: '' });
              }}
              className="text-purple-200 hover:text-white transition-colors"
            >
              {authMode === 'login' 
                ? "Pas encore de compte ? S'inscrire" 
                : 'Déjà un compte ? Se connecter'}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes blob {
            0% { transform: translate(0px, 0px) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
            100% { transform: translate(0px, 0px) scale(1); }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background animé */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-6 mb-8 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-2xl shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Papyrus
                </h1>
                <p className="text-purple-200">Partagez vos connaissances</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-purple-300">Connecté en tant que</p>
                <p className="font-semibold text-white">{user?.username}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-500/20 backdrop-blur text-white px-4 py-2 rounded-xl hover:bg-red-500/30 transition-all border border-red-500/30"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-2 mb-6 border border-white/20">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('my-courses')}
              className={`flex-1 py-3 px-6 rounded-2xl font-semibold transition-all ${
                activeTab === 'my-courses'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-purple-200 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5" />
                Mes Cours
              </div>
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`flex-1 py-3 px-6 rounded-2xl font-semibold transition-all ${
                activeTab === 'discover'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-purple-200 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Search className="w-5 h-5" />
                Découvrir
              </div>
            </button>
            <button
              onClick={() => setActiveTab('shared')}
              className={`flex-1 py-3 px-6 rounded-2xl font-semibold transition-all ${
                activeTab === 'shared'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-purple-200 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Share2 className="w-5 h-5" />
                Partagés avec moi
              </div>
            </button>
          </div>
        </div>

        {/* Upload Section - Only visible on "Mes Cours" */}
        {activeTab === 'my-courses' && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-6 mb-6 border border-white/20">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-purple-400/50 rounded-2xl p-8 cursor-pointer hover:border-purple-400 hover:bg-white/5 transition-all group">
              <Upload className="w-12 h-12 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
              <span className="text-lg font-semibold text-white mb-1">
                {uploadProgress ? 'Téléchargement en cours...' : 'Cliquez pour ajouter un PDF'}
              </span>
              <span className="text-sm text-purple-300">
                Taille maximale: 10 Mo
              </span>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploadProgress}
              />
            </label>
          </div>
        )}

        {/* Search and Sort Bar */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-4 mb-6 border border-white/20">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un cours..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
            
            {activeTab === 'discover' && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
              >
                <option value="recent" className="bg-slate-800">Plus récents</option>
                <option value="popular" className="bg-slate-800">Plus populaires</option>
                <option value="downloads" className="bg-slate-800">Plus téléchargés</option>
              </select>
            )}
          </div>
        </div>

        {/* Course Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20">
              <FileText className="w-20 h-20 text-purple-400 mx-auto mb-4" />
              <p className="text-purple-200 text-lg">
                {searchTerm 
                  ? 'Aucun cours trouvé' 
                  : activeTab === 'my-courses'
                  ? 'Aucun cours disponible. Commencez par en ajouter un !'
                  : activeTab === 'discover'
                  ? 'Aucun cours public disponible pour le moment.'
                  : 'Aucun cours partagé avec vous.'}
              </p>
            </div>
          ) : (
            filteredCourses.map((course) => (
              <div
                key={course._id}
                className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all p-6 border border-white/20 group hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-sm text-purple-300 mb-2">
                      Par {course.owner.username}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-purple-400">
                      <span>{formatFileSize(course.fileSize)}</span>
                      <span>•</span>
                      <span>{formatDate(course.createdAt)}</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    course.shared 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                      : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                  }`}>
                    {course.shared ? 'Public' : 'Privé'}
                  </div>
                </div>

                {course.shareToken && isOwner(course) && (
                  <div className="mb-3 p-2 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-blue-300" />
                    <span className="text-xs text-blue-300 font-medium">Lien de partage actif</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-purple-300 mb-4">
                  <Eye className="w-4 h-4" />
                  <span>{course.views}</span>
                  <Download className="w-4 h-4 ml-2" />
                  <span>{course.downloads}</span>
                </div>

                <div className="space-y-2">
                  {/* Première ligne - Actions principales */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCourse(course)}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
                    >
                      <Eye className="w-4 h-4" />
                      Voir
                    </button>
                    <button
                      onClick={() => downloadPDF(course._id, course.fileName)}
                      className="flex items-center justify-center gap-2 bg-blue-500/20 backdrop-blur text-blue-300 px-4 py-2 rounded-xl hover:bg-blue-500/30 transition-all border border-blue-500/30"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {isOwner(course) && (
                      <button
                        onClick={() => deleteCourse(course._id)}
                        className="flex items-center justify-center gap-2 bg-red-500/20 backdrop-blur text-red-300 px-4 py-2 rounded-xl hover:bg-red-500/30 transition-all border border-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Deuxième ligne - Partage (uniquement pour le propriétaire) */}
                  {isOwner(course) && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleShare(course)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all font-semibold ${
                          course.shared
                            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30'
                            : 'bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30'
                        }`}
                        title={course.shared ? 'Rendre privé' : 'Rendre public'}
                      >
                        {course.shared ? (
                          <>
                            <X className="w-4 h-4" />
                            <span className="text-sm">Rendre Privé</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4" />
                            <span className="text-sm">Rendre Public</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => generateShareLink(course)}
                        className="flex items-center justify-center gap-2 bg-purple-500/20 backdrop-blur text-purple-300 px-4 py-2 rounded-xl hover:bg-purple-500/30 transition-all border border-purple-500/30"
                        title="Générer un lien de partage"
                      >
                        <LinkIcon className="w-4 h-4" />
                        <span className="text-sm">Lien</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Share Link Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Lien de partage</h2>
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setShareLink('');
                    setCopiedLink(false);
                    setCurrentShareCourse(null);
                  }}
                  className="text-purple-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-2 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-purple-200 mb-2">
                  Partagez ce lien avec d'autres personnes pour leur donner accès au cours :
                </p>
                <p className="text-sm text-purple-300 mb-4">
                  <strong>{currentShareCourse?.title}</strong>
                </p>
              </div>
              
              <div className="bg-white/10 border border-white/20 rounded-xl p-3 mb-4">
                <p className="text-sm text-purple-200 break-all font-mono">{shareLink}</p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  {copiedLink ? (
                    <>
                      <span>✓</span>
                      Lien copié !
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copier le lien
                    </>
                  )}
                </button>
                
                <button
                  onClick={revokeShareLink}
                  className="bg-red-500/20 backdrop-blur text-red-300 px-4 py-3 rounded-xl font-semibold hover:bg-red-500/30 transition-all border border-red-500/30"
                  title="Révoquer le lien"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-xs text-purple-400 mt-4 text-center">
                Les personnes ayant ce lien pourront voir et télécharger le cours sans compte
              </p>
            </div>
          </div>
        )}

        {/* PDF Viewer Modal */}
        {selectedCourse && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-white/20">
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedCourse.title}</h2>
                  <p className="text-sm text-purple-300">Par {selectedCourse.owner.username}</p>
                </div>
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="text-purple-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-2 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <div className="bg-white rounded-2xl overflow-hidden">
                  <iframe
                    src={`${BASE_URL}/${selectedCourse.filePath}`}
                    className="w-full h-full min-h-[700px] border-0"
                    title={selectedCourse.title}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}