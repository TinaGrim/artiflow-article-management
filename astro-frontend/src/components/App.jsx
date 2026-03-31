import { lazy, Suspense, createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Home, Info, FolderOpen, PenLine, LogOut, User, Edit2, Trash2, Sparkles, TrendingUp, Users, CheckCircle, XCircle, AlertCircle, X, ChevronRight, Loader2, MessageCircle, Heart, Reply, Send, MoreHorizontal } from 'lucide-react';
import { authAPI, usersAPI, articlesAPI, categoriesAPI, commentsAPI } from '../lib/api';

const GlobalStyles = () => (
  <style>{`
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; scroll-padding-top: 80px; }
    body {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background: linear-gradient(180deg, #FFFBF5 0%, #FFF5F5 50%, #FFF5EB 100%);
      color: #5D4037;
      min-height: 100vh;
    }
    h1, h2, h3, h4, h5, h6 { font-family: 'Outfit', sans-serif; }
    a { color: inherit; text-decoration: none; }
    ::selection { background: rgba(255, 107, 107, 0.3); color: #5D4037; }
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: rgba(252, 182, 159, 0.1); }
    ::-webkit-scrollbar-thumb { background: linear-gradient(135deg, #FF6B6B 0%, #FCB69F 100%); border-radius: 10px; }
    input:focus, textarea:focus, select:focus { outline: none; border-color: #FF6B6B !important; box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.15); }
  `}</style>
);

const ToastContext = createContext(null);

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const useToast = () => useContext(ToastContext);

const ToastContainer = ({ toasts, removeToast }) => (
  <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '12px' }}>
    <AnimatePresence>
      {toasts.map((t) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, x: 100, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.9 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 20px',
            borderRadius: '12px',
            background: 'white',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            border: `2px solid ${t.type === 'success' ? '#4CAF50' : t.type === 'error' ? '#FF6B6B' : t.type === 'warning' ? '#FFD93D' : '#64B5F6'}`,
            maxWidth: '360px',
          }}
        >
          {t.type === 'success' && <CheckCircle size={20} color="#4CAF50" />}
          {t.type === 'error' && <XCircle size={20} color="#FF6B6B" />}
          {t.type === 'warning' && <AlertCircle size={20} color="#F59E0B" />}
          {t.type === 'info' && <AlertCircle size={20} color="#64B5F6" />}
          <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: '#5D4037' }}>{t.message}</span>
          <button onClick={() => removeToast(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={16} color="#A1887F" />
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const response = await usersAPI.getMe();
          setUser(response.data);
        } catch (err) {
          if (err?.response?.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    const { access_token, refresh_token } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    const userResponse = await usersAPI.getMe();
    setUser(userResponse.data);
    return userResponse.data;
  };

  const register = async (userData) => {
    const response = await authAPI.register(userData);
    const { user: newUser, access_token, refresh_token } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

const Skeleton = ({ width = '100%', height = '20px', borderRadius = '8px' }) => (
  <motion.div
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ duration: 1.5, repeat: Infinity }}
    style={{ width, height, borderRadius, background: 'linear-gradient(90deg, #FFE4D6 0%, #FFF0E6 50%, #FFE4D6 100%)', backgroundSize: '200% 100%' }}
  />
);

const CardSkeleton = () => (
  <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(93, 64, 55, 0.1)', border: '1px solid rgba(255, 107, 107, 0.1)' }}>
    <Skeleton height="160px" borderRadius="0" />
    <div style={{ padding: '20px' }}>
      <Skeleton width="30%" height="14px" />
      <div style={{ marginTop: '12px' }}><Skeleton width="80%" height="18px" /></div>
      <div style={{ marginTop: '8px' }}><Skeleton width="60%" height="14px" /></div>
      <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Skeleton width="28px" height="28px" borderRadius="50%" />
        <Skeleton width="80px" height="12px" />
      </div>
    </div>
  </div>
);

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Delete', loading = false }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '24px' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '100%', textAlign: 'center' }}
      >
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255, 107, 107, 0.1)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trash2 size={28} color="#FF6B6B" />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#5D4037', marginBottom: '12px' }}>{title}</h3>
        <p style={{ fontSize: '15px', color: '#8D6E63', marginBottom: '24px', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCancel}
            disabled={loading}
            style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #FFE4D6', background: 'white', color: '#5D4037', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            disabled={loading}
            style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: loading ? '#ccc' : 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)', color: 'white', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : confirmText}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Breadcrumbs = ({ items }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#A1887F', marginBottom: '24px' }}>
    {items.map((item, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {i > 0 && <ChevronRight size={14} />}
        {item.path ? (
          <Link to={item.path} style={{ color: '#FF6B6B', fontWeight: '600', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#e55a5a'} onMouseLeave={e => e.target.style.color = '#FF6B6B'}>
            {item.label}
          </Link>
        ) : (
          <span style={{ color: '#5D4037', fontWeight: '600' }}>{item.label}</span>
        )}
      </div>
    ))}
  </div>
);

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const toast = useToast();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const navLinks = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/articles', label: 'Articles', icon: BookOpen },
    { path: '/categories', label: 'Categories', icon: FolderOpen },
    { path: '/about', label: 'About', icon: Info },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255, 248, 240, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #FFE4D6' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.div whileHover={{ rotate: 10 }} style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={22} color="white" />
          </motion.div>
          <span style={{ fontSize: '22px', fontWeight: '700', fontFamily: "'Outfit', sans-serif", background: 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ArtiFlow</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {navLinks.map(({ path, label }) => (
              <motion.div key={path} whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}>
                <Link to={path} style={{ padding: '10px 16px', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: '600', color: isActive(path) ? '#FF6B6B' : '#5D4037', background: isActive(path) ? 'rgba(255, 107, 107, 0.1)' : 'transparent', transition: 'all 0.2s' }}>
                  {label}
                </Link>
              </motion.div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/write">
              <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)' }}>
                <PenLine size={16} />Write
              </motion.button>
            </Link>
            {user ? (
              <>
                <Link to="/profile">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #FFE4D6', background: 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(255, 107, 107, 0.2)' }}>
                    <User size={18} color="white" />
                  </motion.button>
                </Link>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={handleLogout} title="Logout" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #FFE4D6', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <LogOut size={18} color="#5D4037" />
                </motion.button>
              </>
            ) : (
              <Link to="/login">
                <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} style={{ padding: '10px 20px', borderRadius: '12px', border: '2px solid #FFE4D6', background: 'white', color: '#5D4037', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  Sign In
                </motion.button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const Footer = () => (
  <footer style={{ background: 'linear-gradient(180deg, #FFF8F0 0%, #FFE4D6 100%)', borderTop: '1px solid #FFE4D6', padding: '48px 24px 24px', marginTop: '80px' }}>
    <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
      <p style={{ fontSize: '14px', color: '#A1887F' }}>Made with love by ArtiFlow Team</p>
      <p style={{ fontSize: '12px', color: '#A1887F', marginTop: '8px' }}>2026 ArtiFlow. All rights reserved.</p>
    </div>
  </footer>
);

const Spinner = ({ size = 40 }) => (
  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ width: size, height: size, border: `3px solid #FFE4D6`, borderTopColor: '#FF6B6B', borderRadius: '50%' }} />
);

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const pageTransition = { duration: 0.3, ease: 'easeInOut' };

const HomePage = () => {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      articlesAPI.getAll({ page: 1, limit: 6 }),
      categoriesAPI.getAll()
    ])
      .then(([articlesRes, categoriesRes]) => {
        setArticles(articlesRes.data.items || []);
        setCategories(categoriesRes.data || []);
      })
      .catch((err) => {
        toast.error('Failed to load content');
      })
      .finally(() => setLoading(false));
  }, []);

  const categoryColors = ['#FF6B6B', '#FFA07A', '#FFD93D', '#4CAF50', '#64B5F6', '#9C27B0', '#E91E63', '#00BCD4'];

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
      <section style={{ padding: '60px 24px 80px', textAlign: 'center', maxWidth: '900px', margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(255,107,107,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '-30%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255,160,122,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <motion.div
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            style={{ display: 'inline-flex', padding: '24px', borderRadius: '28px', background: 'rgba(255, 107, 107, 0.12)', marginBottom: '28px', position: 'relative' }}
          >
            <Sparkles size={56} color="#FF6B6B" />
          </motion.div>

          <h1 style={{ fontSize: 'clamp(40px, 7vw, 64px)', fontWeight: '800', fontFamily: "'Outfit', sans-serif", color: '#5D4037', marginBottom: '20px', lineHeight: 1.1 }}>
            Where Stories Come <span style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Alive</span>
          </h1>
          <p style={{ fontSize: '20px', color: '#8D6E63', maxWidth: '550px', margin: '0 auto', lineHeight: 1.6 }}>
            A warm corner of the internet for writers, thinkers, and dreamers. Share your voice with the world.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center', marginTop: '24px' }}>
            <Link to="/articles">
              <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }} style={{ padding: '14px 28px', borderRadius: '12px', border: 'none', background: 'white', color: '#5D4037', fontSize: '15px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(93, 64, 55, 0.1)' }}>
                Explore Articles
              </motion.button>
            </Link>
            <Link to="/write">
              <motion.button whileHover={{ scale: 1.08, y: -4 }} whileTap={{ scale: 0.96 }} style={{ padding: '20px 48px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)', color: 'white', fontSize: '18px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 12px 32px rgba(255, 107, 107, 0.4)', letterSpacing: '0.5px' }}>
                ✍️ Start Writing
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {categories.length > 0 && (
        <section style={{ marginTop: '28px', maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#5D4037', margin: 0 }}>Explore Categories</h2>
            <Link to="/categories" style={{ color: '#FF6B6B', fontSize: '14px', fontWeight: '600' }}>View all →</Link>
          </div>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
            {categories.slice(0, 6).map((cat, i) => (
              <motion.div key={cat.id} whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.98 }}>
                <Link to={`/categories/${cat.slug}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 20px', background: 'white', borderRadius: '14px', boxShadow: '0 4px 12px rgba(93, 64, 55, 0.08)', border: '1px solid #FFE4D6', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${categoryColors[i % categoryColors.length]}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FolderOpen size={18} color={categoryColors[i % categoryColors.length]} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#5D4037' }}>{cat.name}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#5D4037', margin: 0 }}>Latest Stories</h2>
          <Link to="/articles" style={{ color: '#FF6B6B', fontSize: '14px', fontWeight: '600' }}>View all →</Link>
        </div>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : articles.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {articles.map((article, i) => (
              <motion.div key={article.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileHover={{ y: -6 }}>
                <Link to={`/articles/${article.slug}`}>
                  <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(93, 64, 55, 0.1)', border: '1px solid rgba(255, 107, 107, 0.1)', height: '100%', cursor: 'pointer' }}>
                    <div style={{ height: '160px', background: `linear-gradient(135deg, ${['#FF6B6B', '#FFA07A', '#FFD93D', '#4CAF50'][i % 4]}15, ${['#FF6B6B', '#FFA07A', '#FFD93D', '#4CAF50'][i % 4]}05)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <BookOpen size={44} color="#A1887F" style={{ opacity: 0.4 }} />
                      <span style={{ position: 'absolute', top: '12px', right: '12px', padding: '6px 12px', background: 'white', borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: '#FF6B6B' }}>{article.category_name || 'General'}</span>
                    </div>
                    <div style={{ padding: '20px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#5D4037', marginBottom: '10px', fontFamily: "'Outfit', sans-serif", lineHeight: 1.3 }}>{article.title}</h3>
                      <p style={{ fontSize: '14px', color: '#8D6E63', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '12px' }}>{article.content?.replace(/<[^>]*>/g, '').slice(0, 100)}...</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B6B, #FFA07A)' }} />
                        <span style={{ fontSize: '12px', color: '#A1887F' }}>{article.author_name || 'Anonymous'}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState icon={BookOpen} title="No articles yet" message="Be the first to share your story!" action={{ label: 'Write an Article', path: '/write' }} />
        )}
      </section>

      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px 80px', textAlign: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '40px' }}>
          {[
            { icon: BookOpen, label: 'Articles', value: '50+', color: '#FF6B6B' },
            { icon: Users, label: 'Writers', value: '10K+', color: '#FFA07A' },
            { icon: TrendingUp, label: 'Views', value: '10K+', color: '#4CAF50' },
            { icon: Sparkles, label: 'Categories', value: '13', color: '#9C27B0' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(255, 107, 107, 0.15)' }}
              style={{ background: 'white', borderRadius: '16px', padding: '20px', textAlign: 'center', boxShadow: '0 4px 16px rgba(93, 64, 55, 0.08)', border: '1px solid rgba(255, 107, 107, 0.1)' }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${stat.color}15`, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon size={24} color={stat.color} />
              </div>
              <p style={{ fontSize: '28px', fontWeight: '800', color: '#5D4037', margin: '0 0 4px' }}>{stat.value}</p>
              <p style={{ fontSize: '13px', color: '#A1887F', margin: 0 }}>{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
};

const EmptyState = ({ icon: Icon, title, message, action }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '80px 24px', background: 'white', borderRadius: '20px', boxShadow: '0 4px 16px rgba(93, 64, 55, 0.08)', border: '1px solid rgba(255, 107, 107, 0.1)' }}>
    <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }} style={{ display: 'inline-block' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,107,107,0.1), rgba(255,160,122,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
        <Icon size={40} color="#FFA07A" />
      </div>
    </motion.div>
    <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#5D4037', marginBottom: '12px' }}>{title}</h3>
    <p style={{ fontSize: '16px', color: '#8D6E63', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>{message}</p>
    {action && (
      <Link to={action.path}>
        <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }} style={{ padding: '14px 28px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)', color: 'white', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
          {action.label}
        </motion.button>
      </Link>
    )}
  </motion.div>
);

const ArticlesPage = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    articlesAPI.getAll({ page: 1, limit: 12 })
      .then(res => setArticles(res.data.items || []))
      .catch(() => toast.error('Failed to load articles'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition} style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ fontSize: '48px', fontWeight: '800', color: '#5D4037', marginBottom: '32px', textAlign: 'center' }}>All Articles</h1>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : articles.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {articles.map((article, i) => (
            <motion.div key={article.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -6 }}>
              <Link to={`/articles/${article.slug}`}>
                <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(93, 64, 55, 0.12)', border: '1px solid #FFE4D6', height: '100%', cursor: 'pointer' }}>
                  <div style={{ height: '140px', background: `linear-gradient(135deg, ${['#FF6B6B', '#FFA07A', '#FFD93D', '#4CAF50', '#64B5F6'][i % 5]}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={32} color="#A1887F" style={{ opacity: 0.5 }} />
                  </div>
                  <div style={{ padding: '16px' }}>
                    <span style={{ display: 'inline-block', padding: '4px 10px', background: 'rgba(255, 107, 107, 0.1)', color: '#FF6B6B', borderRadius: '16px', fontSize: '11px', fontWeight: '600', marginBottom: '8px' }}>{article.category_name || 'General'}</span>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#5D4037', marginBottom: '6px' }}>{article.title}</h3>
                    <p style={{ fontSize: '13px', color: '#8D6E63' }}>{article.author_name || 'Anonymous'}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState icon={BookOpen} title="No articles yet" message="Start sharing your thoughts with the world!" action={{ label: 'Write an Article', path: '/write' }} />
      )}
    </motion.div>
  );
};

const LoginPage = () => {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const usernameRef = useRef(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!form.username.trim()) newErrors.username = 'Username is required';
    if (!form.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition} style={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 8px 30px rgba(252, 182, 159, 0.15)', border: '1px solid rgba(255, 107, 107, 0.1)' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#5D4037', textAlign: 'center', marginBottom: '8px' }}>Welcome Back!</h1>
          <p style={{ fontSize: '15px', color: '#8D6E63', textAlign: 'center', marginBottom: '32px' }}>Sign in to continue</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#5D4037' }}>Username</label>
              <input ref={usernameRef} type="text" value={form.username} onChange={e => { setForm({ ...form, username: e.target.value }); setErrors({ ...errors, username: '' }); }} required style={{ width: '100%', padding: '14px 16px', fontSize: '15px', border: `2px solid ${errors.username ? '#FF6B6B' : '#FFE4D6'}`, borderRadius: '12px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }} />
              {errors.username && <p style={{ color: '#FF6B6B', fontSize: '12px', marginTop: '6px' }}>{errors.username}</p>}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#5D4037' }}>Password</label>
              <input type="password" value={form.password} onChange={e => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: '' }); }} required style={{ width: '100%', padding: '14px 16px', fontSize: '15px', border: `2px solid ${errors.password ? '#FF6B6B' : '#FFE4D6'}`, borderRadius: '12px', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }} />
              {errors.password && <p style={{ color: '#FF6B6B', fontSize: '12px', marginTop: '6px' }}>{errors.password}</p>}
            </div>
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading} style={{ padding: '14px', borderRadius: '12px', border: 'none', background: loading ? '#ccc' : 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)', color: 'white', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px' }}>
              {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Sign In'}
            </motion.button>
          </form>

          <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#8D6E63' }}>Don't have an account? <Link to="/register" style={{ color: '#FF6B6B', fontWeight: '600' }}>Sign up</Link></p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const RegisterPage = () => {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const usernameRef = useRef(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!form.username.trim()) newErrors.username = 'Username is required';
    else if (form.username.length < 3) newErrors.username = 'Username must be at least 3 characters';
    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register({ username: form.username, password: form.password });
      toast.success('Account created successfully!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field) => ({
    width: '100%',
    padding: '14px 16px',
    fontSize: '15px',
    border: `2px solid ${errors[field] ? '#FF6B6B' : '#FFE4D6'}`,
    borderRadius: '12px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  });

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition} style={{ minHeight: 'calc(100vh - 200px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 8px 30px rgba(252, 182, 159, 0.15)', border: '1px solid rgba(255, 107, 107, 0.1)' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#5D4037', textAlign: 'center', marginBottom: '8px' }}>Join ArtiFlow!</h1>
          <p style={{ fontSize: '15px', color: '#8D6E63', textAlign: 'center', marginBottom: '32px' }}>Create your account</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#5D4037' }}>Username</label>
              <input ref={usernameRef} type="text" value={form.username} onChange={e => { setForm({ ...form, username: e.target.value }); setErrors({ ...errors, username: '' }); }} style={inputStyle('username')} />
              {errors.username && <p style={{ color: '#FF6B6B', fontSize: '12px', marginTop: '6px' }}>{errors.username}</p>}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#5D4037' }}>Password</label>
              <input type="password" value={form.password} onChange={e => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: '' }); }} style={inputStyle('password')} />
              {errors.password && <p style={{ color: '#FF6B6B', fontSize: '12px', marginTop: '6px' }}>{errors.password}</p>}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#5D4037' }}>Confirm Password</label>
              <input type="password" value={form.confirmPassword} onChange={e => { setForm({ ...form, confirmPassword: e.target.value }); setErrors({ ...errors, confirmPassword: '' }); }} style={inputStyle('confirmPassword')} />
              {errors.confirmPassword && <p style={{ color: '#FF6B6B', fontSize: '12px', marginTop: '6px' }}>{errors.confirmPassword}</p>}
            </div>
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading} style={{ padding: '14px', borderRadius: '12px', border: 'none', background: loading ? '#ccc' : 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)', color: 'white', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '8px' }}>
              {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Create Account'}
            </motion.button>
          </form>

          <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#8D6E63' }}>Already have an account? <Link to="/login" style={{ color: '#FF6B6B', fontWeight: '600' }}>Sign in</Link></p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const AboutPage = () => {
  const { user } = useAuth();
  const features = [
    { icon: '✍️', title: 'Easy Writing', desc: 'Distraction-free editor to capture your thoughts' },
    { icon: '📚', title: 'Organize', desc: 'Categories and tags to organize your stories' },
    { icon: '🌟', title: 'Share', desc: 'Publish and share your work with the world' },
    { icon: '💬', title: 'Connect', desc: 'Build an audience and connect with readers' },
  ];

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition}>
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: '800', fontFamily: "'Outfit', sans-serif", color: '#5D4037', marginBottom: '20px', lineHeight: 1.2 }}>
            About <span style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ArtiFlow</span>
          </h1>
          <p style={{ fontSize: '20px', color: '#8D6E63', lineHeight: 1.7, maxWidth: '600px', margin: '0 auto 36px' }}>
            A warm corner of the internet for writers, thinkers, and dreamers.
            We believe everyone has a story worth telling.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={user ? "/articles" : "/register"}><motion.button whileHover={{ scale: 1.05, y: -2 }} style={{ padding: '16px 32px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)', color: 'white', fontSize: '16px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 24px rgba(255, 107, 107, 0.35)' }}>{user ? 'Explore Articles' : 'Get Started'}</motion.button></Link>
            <Link to="/articles"><motion.button whileHover={{ scale: 1.05, y: -2 }} style={{ padding: '16px 32px', borderRadius: '14px', border: '2px solid #FFE4D6', background: 'white', color: '#5D4037', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>Read Articles</motion.button></Link>
          </div>
        </motion.div>
      </section>

      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px 80px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '700', color: '#5D4037', marginBottom: '40px', textAlign: 'center' }}>What We Offer</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} whileHover={{ y: -8, boxShadow: '0 16px 40px rgba(255, 107, 107, 0.15)' }} style={{ background: 'white', borderRadius: '20px', padding: '32px', textAlign: 'center', boxShadow: '0 8px 24px rgba(93, 64, 55, 0.08)', border: '1px solid rgba(255, 107, 107, 0.1)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>{f.icon}</div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#5D4037', marginBottom: '8px' }}>{f.title}</h3>
              <p style={{ fontSize: '15px', color: '#8D6E63', lineHeight: 1.6 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px 80px', textAlign: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)', borderRadius: '24px', padding: '60px 40px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '700', color: 'white', marginBottom: '16px' }}>{user ? 'Continue Writing!' : 'Ready to Start Writing?'}</h2>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)', marginBottom: '28px' }}>{user ? 'Share your next story with the world.' : 'Join thousands of writers sharing their stories.'}</p>
          <Link to={user ? "/write" : "/register"}><motion.button whileHover={{ scale: 1.05 }} style={{ padding: '16px 36px', borderRadius: '14px', border: 'none', background: 'white', color: '#FF6B6B', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>{user ? 'Write an Article' : 'Create Free Account'}</motion.button></Link>
        </div>
      </section>
    </motion.div>
  );
};

const CategoriesPage = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, name: '' });
  const toast = useToast();
  const nameRef = useRef(null);

  const fetchCategories = () => {
    categoriesAPI.getAll()
      .then(res => setCategories(res.data || []))
      .catch(() => toast.error('Failed to load categories'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (showForm && nameRef.current) {
      nameRef.current.focus();
    }
  }, [showForm]);

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingCategory(null);
    setFormError('');
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (cat) => {
    setEditingCategory(cat);
    setFormData({ name: cat.name, description: cat.description || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Category name is required');
      return;
    }
    setFormLoading(true);
    setFormError('');
    try {
      const payload = {
        name: formData.name,
        slug: formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        description: formData.description || '',
      };
      if (editingCategory) {
        await categoriesAPI.update(editingCategory.id, payload);
        toast.success('Category updated!');
      } else {
        await categoriesAPI.create(payload);
        toast.success('Category created!');
      }
      fetchCategories();
      setTimeout(() => {
        resetForm();
        setShowForm(false);
      }, 1000);
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to save category');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    setFormLoading(true);
    try {
      await categoriesAPI.delete(deleteConfirm.id);
      toast.success('Category deleted!');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete category');
    } finally {
      setFormLoading(false);
      setDeleteConfirm({ open: false, id: null, name: '' });
    }
  };

  const colors = ['#FF6B6B', '#FFA07A', '#FFD93D', '#4CAF50', '#64B5F6', '#9C27B0'];

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition} style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
      <Breadcrumbs items={[{ label: 'Home', path: '/' }, { label: 'Categories' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ fontSize: '48px', fontWeight: '800', color: '#5D4037', margin: 0 }}>Categories</h1>
        {user && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => showForm ? (resetForm(), setShowForm(false)) : openCreateForm()}
            style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: showForm ? '#FFE4D6' : 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)', color: showForm ? '#5D4037' : 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
          >
            {showForm ? 'Cancel' : '+ Add Category'}
          </motion.button>
        )}
      </div>

      {user && showForm && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'white', borderRadius: '16px', padding: '24px', marginBottom: '32px', boxShadow: '0 4px 16px rgba(93, 64, 55, 0.12)', border: '1px solid #FFE4D6' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#5D4037', marginBottom: '16px' }}>
            {editingCategory ? 'Edit Category' : 'Create New Category'}
          </h3>
          {formError && <div style={{ padding: '12px', background: 'rgba(255, 107, 107, 0.1)', color: '#FF6B6B', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{formError}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#5D4037' }}>Name</label>
              <input ref={nameRef} type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Technology" style={{ width: '100%', padding: '12px 16px', fontSize: '15px', border: '2px solid #FFE4D6', borderRadius: '12px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#5D4037' }}>Description (optional)</label>
              <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description" style={{ width: '100%', padding: '12px 16px', fontSize: '15px', border: '2px solid #FFE4D6', borderRadius: '12px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={formLoading} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: formLoading ? '#ccc' : 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)', color: 'white', fontSize: '15px', fontWeight: '600', cursor: formLoading ? 'not-allowed' : 'pointer' }}>
              {formLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : (editingCategory ? 'Update Category' : 'Create Category')}
            </motion.button>
          </form>
        </motion.div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : categories.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {categories.map((cat, i) => (
            <motion.div key={cat.id} whileHover={{ y: -4 }} style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 16px rgba(93, 64, 55, 0.12)', border: '1px solid #FFE4D6', overflow: 'hidden' }}>
              <Link to={`/categories/${cat.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '24px', textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: `${colors[i % colors.length]}22`, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FolderOpen size={28} color={colors[i % colors.length]} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#5D4037', marginBottom: '8px' }}>{cat.name}</h3>
                  {cat.description && <p style={{ fontSize: '14px', color: '#8D6E63', margin: '0', lineHeight: 1.5 }}>{cat.description}</p>}
                </div>
              </Link>
              {user && (
                <div style={{ display: 'flex', borderTop: '1px solid #FFE4D6' }}>
                  <motion.button whileHover={{ backgroundColor: 'rgba(255, 107, 107, 0.1)' }} onClick={() => openEditForm(cat)} style={{ flex: 1, padding: '12px', border: 'none', background: 'transparent', color: '#FF6B6B', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Edit2 size={14} /> Edit
                  </motion.button>
                  <motion.button whileHover={{ backgroundColor: 'rgba(255, 107, 107, 0.1)' }} onClick={() => setDeleteConfirm({ open: true, id: cat.id, name: cat.name })} style={{ flex: 1, padding: '12px', border: 'none', borderLeft: '1px solid #FFE4D6', background: 'transparent', color: '#FF6B6B', fontSize: '14px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Trash2 size={14} /> Delete
                  </motion.button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState icon={FolderOpen} title="No categories yet" message={user ? "Create your first category to organize articles" : "No categories available yet"} action={user ? { label: 'Create First Category', path: '/categories' } : null} />
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null, name: '' })}
        loading={formLoading}
      />
    </motion.div>
  );
};

const CategoryArticlesPage = () => {
  const { slug } = useParams();
  const [articles, setArticles] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    categoriesAPI.getBySlug(slug)
      .then(catRes => {
        const catData = catRes.data.category || catRes.data;
        setCategory(catData);
        return articlesAPI.getAll({ category: catData.id, limit: 50 });
      })
      .then(articlesRes => {
        setArticles(articlesRes.data.items || []);
      })
      .catch(err => {
        setError('Category not found');
        toast.error('Failed to load category');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition} style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
      <Breadcrumbs items={[{ label: 'Home', path: '/' }, { label: 'Categories', path: '/categories' }, { label: category?.name || slug }]} />

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <EmptyState icon={FolderOpen} title="Category not found" message="The category you're looking for doesn't exist" action={{ label: 'View All Categories', path: '/categories' }} />
      ) : (
        <>
          <h1 style={{ fontSize: '36px', fontWeight: '800', color: '#5D4037', marginBottom: '8px' }}>{category?.name || slug}</h1>
          {category?.description && <p style={{ fontSize: '16px', color: '#8D6E63', marginBottom: '32px' }}>{category.description}</p>}

          {articles.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {articles.map((article, i) => (
                <motion.div key={article.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -6 }}>
                  <Link to={`/articles/${article.slug}`}>
                    <div style={{ background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(93, 64, 55, 0.1)', border: '1px solid rgba(255, 107, 107, 0.1)', height: '100%', cursor: 'pointer' }}>
                      <div style={{ height: '140px', background: `linear-gradient(135deg, ${['#FF6B6B', '#FFA07A', '#FFD93D', '#4CAF50'][i % 4]}15, ${['#FF6B6B', '#FFA07A', '#FFD93D', '#4CAF50'][i % 4]}05)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BookOpen size={36} color="#A1887F" style={{ opacity: 0.4 }} />
                      </div>
                      <div style={{ padding: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#5D4037', marginBottom: '8px' }}>{article.title}</h3>
                        <p style={{ fontSize: '13px', color: '#A1887F' }}>{article.author_username || 'Anonymous'}</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState icon={BookOpen} title="No articles in this category" message="Be the first to write an article in this category!" action={{ label: 'Write an Article', path: '/write' }} />
          )}
        </>
      )}
    </motion.div>
  );
};

const WritePage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', content: '', tags: '', category_id: '' });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
    categoriesAPI.getAll()
      .then(res => setCategories(res.data || []))
      .catch(() => toast.error('Failed to load categories'));
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.content.trim()) newErrors.content = 'Content is required';
    else if (form.content.trim().length < 10) newErrors.content = 'Content must be at least 10 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    setLoading(true);

    const tagsArray = form.tags.split(',').map(t => t.trim()).filter(t => t);

    try {
      await articlesAPI.createAnonymous({
        title: form.title,
        slug: form.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        content: form.content,
        category_id: form.category_id || null,
        tags: tagsArray,
      });
      toast.success('Article published successfully!');
      navigate('/articles');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create article');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition} style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
      <Breadcrumbs items={[{ label: 'Home', path: '/' }, { label: 'Write' }]} />

      <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#5D4037', marginBottom: '8px', textAlign: 'center' }}>Write an Article</h1>
      {!user && <p style={{ textAlign: 'center', color: '#8D6E63', marginBottom: '32px', fontSize: '15px' }}>Sign in to get credited for your articles, or publish anonymously.</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ background: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 8px 32px rgba(252, 182, 159, 0.1)', border: '1px solid rgba(255, 107, 107, 0.1)' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#5D4037' }}>Title *</label>
            <input ref={titleRef} type="text" value={form.title} onChange={e => { setForm({ ...form, title: e.target.value }); setErrors({ ...errors, title: '' }); }} placeholder="Give your article a catchy title..." style={{ width: '100%', padding: '16px', fontSize: '18px', border: `2px solid ${errors.title ? '#FF6B6B' : '#FFE4D6'}`, borderRadius: '12px', outline: 'none', boxSizing: 'border-box' }} />
            {errors.title && <p style={{ color: '#FF6B6B', fontSize: '12px', marginTop: '6px' }}>{errors.title}</p>}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#5D4037' }}>Category</label>
            <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} style={{ width: '100%', padding: '14px 16px', fontSize: '15px', border: '2px solid #FFE4D6', borderRadius: '12px', outline: 'none', background: 'white', cursor: 'pointer' }}>
              <option value="">Select a category (optional)</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#5D4037' }}>Content *</label>
            <textarea value={form.content} onChange={e => { setForm({ ...form, content: e.target.value }); setErrors({ ...errors, content: '' }); }} placeholder="Tell your story..." rows={12} style={{ width: '100%', padding: '16px', fontSize: '15px', border: `2px solid ${errors.content ? '#FF6B6B' : '#FFE4D6'}`, borderRadius: '12px', outline: 'none', boxSizing: 'border-box', resize: 'vertical', minHeight: '200px', fontFamily: 'inherit', lineHeight: 1.6 }} />
            {errors.content && <p style={{ color: '#FF6B6B', fontSize: '12px', marginTop: '6px' }}>{errors.content}</p>}
            <p style={{ fontSize: '12px', color: '#A1887F', marginTop: '8px' }}>{form.content.length} characters</p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#5D4037' }}>Tags</label>
            <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="tag1, tag2, tag3 (comma separated)" style={{ width: '100%', padding: '14px 16px', fontSize: '15px', border: '2px solid #FFE4D6', borderRadius: '12px', outline: 'none', boxSizing: 'border-box' }} />
            <p style={{ fontSize: '12px', color: '#A1887F', marginTop: '8px' }}>Separate tags with commas</p>
          </div>

          <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: loading ? '#ccc' : 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)', color: 'white', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(255, 107, 107, 0.3)' }}>
            {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Publish Article'}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};

const ArticleDetailPage = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    articlesAPI.getBySlug(slug)
      .then(res => setArticle(res.data))
      .catch(() => setError('Article not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!article?.id) return;
    setCommentsLoading(true);
    commentsAPI.getByArticle(article.id)
      .then(res => setComments(res.data?.comments || res.data || []))
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [article?.id]);

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    setDeleteLoading(true);
    try {
      await articlesAPI.delete(deleteConfirm.id);
      toast.success('Article deleted!');
      window.location.href = '/articles';
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete article');
    } finally {
      setDeleteLoading(false);
      setDeleteConfirm({ open: false, id: null });
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setSubmitting(true);
    try {
      const res = await commentsAPI.create(article.id, { content: commentText, parent_id: null });
      setComments(prev => [res.data, ...prev]);
      setCommentText('');
      toast.success('Comment added!');
    } catch (err) {
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplySubmit = async (e, parentId) => {
    e.preventDefault();
    if (!replyText.trim() || !user) return;
    setSubmitting(true);
    try {
      const res = await commentsAPI.create(article.id, { content: replyText, parent_id: parentId });
      setComments(prev => prev.map(c => {
        if (c.id === parentId) {
          return { ...c, replies: [...(c.replies || []), res.data] };
        }
        return c;
      }));
      setReplyText('');
      setReplyingTo(null);
      toast.success('Reply added!');
    } catch (err) {
      toast.error('Failed to add reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!user) {
      toast.info('Please login to like comments');
      return;
    }
    try {
      const res = await commentsAPI.like(commentId);
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, likes: res.data.likes, liked_by: res.data.liked_by } : c));
    } catch (err) {
      toast.error('Failed to like comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await commentsAPI.delete(commentId);
      setComments(prev => prev.map(c => {
        if (c.id === commentId) return null;
        if (c.replies) {
          c.replies = c.replies.filter(r => r.id !== commentId);
        }
        return c;
      }).filter(Boolean));
      toast.success('Comment deleted!');
    } catch (err) {
      toast.error('Failed to delete comment');
    }
  };

  const handleDeleteReply = async (commentId, parentId) => {
    try {
      await commentsAPI.delete(commentId);
      setComments(prev => prev.map(c => {
        if (c.id === parentId && c.replies) {
          return { ...c, replies: c.replies.filter(r => r.id !== commentId) };
        }
        return c;
      }));
      toast.success('Reply deleted!');
    } catch (err) {
      toast.error('Failed to delete reply');
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Spinner size={48} /></div>;
  if (error || !article) return <EmptyState icon={BookOpen} title="Article not found" message="The article you're looking for doesn't exist" action={{ label: 'Browse Articles', path: '/articles' }} />;

  const isOwner = user && article.author_id === user.id;

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition} style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
      <Breadcrumbs items={[{ label: 'Home', path: '/' }, { label: 'Articles', path: '/articles' }, { label: article.title }]} />

      <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '48px', boxShadow: '0 8px 32px rgba(252, 182, 159, 0.1)', border: '1px solid rgba(255, 107, 107, 0.1)' }}>
          <span style={{ display: 'inline-block', padding: '6px 14px', background: 'rgba(255, 107, 107, 0.1)', color: '#FF6B6B', borderRadius: '20px', fontSize: '12px', fontWeight: '600', marginBottom: '16px' }}>{article.category_name || 'Uncategorized'}</span>

          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: '800', color: '#5D4037', marginBottom: '20px', lineHeight: 1.2 }}>{article.title}</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #FFE4D6' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B6B, #FFA07A)' }} />
            <div>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#5D4037', margin: 0 }}>{article.author_username || 'Anonymous'}</p>
              <p style={{ fontSize: '13px', color: '#A1887F', margin: 0 }}>{new Date(article.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            {isOwner && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <Link to={`/edit/${article.slug}`}>
                  <motion.button whileHover={{ scale: 1.05 }} style={{ padding: '10px 16px', borderRadius: '10px', border: '2px solid #FFE4D6', background: 'white', color: '#5D4037', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Edit2 size={14} /> Edit
                  </motion.button>
                </Link>
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setDeleteConfirm({ open: true, id: article.id })} style={{ padding: '10px 16px', borderRadius: '10px', border: '2px solid #FFE4D6', background: 'white', color: '#FF6B6B', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Trash2 size={14} /> Delete
                </motion.button>
              </div>
            )}
          </div>

          <div style={{ fontSize: '17px', lineHeight: 1.8, color: '#5D4037', whiteSpace: 'pre-wrap' }}>
            {article.content}
          </div>

          {article.tags && article.tags.length > 0 && (
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #FFE4D6', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {article.tags.map((tag, i) => (
                <span key={i} style={{ padding: '6px 12px', background: 'rgba(255, 107, 107, 0.1)', color: '#FF6B6B', borderRadius: '16px', fontSize: '12px', fontWeight: '600' }}>#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </motion.article>

      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginTop: '32px' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 8px 32px rgba(252, 182, 159, 0.1)', border: '1px solid rgba(255, 107, 107, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <MessageCircle size={24} color="#FF6B6B" />
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#5D4037', margin: 0 }}>Comments</h2>
            <span style={{ padding: '4px 10px', background: 'rgba(255, 107, 107, 0.1)', color: '#FF6B6B', borderRadius: '12px', fontSize: '13px', fontWeight: '600' }}>{comments.length}</span>
          </div>

          {user ? (
            <form onSubmit={handleCommentSubmit} style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B6B, #FFA07A)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your thoughts..."
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '2px solid #FFE4D6', fontSize: '14px', resize: 'none', minHeight: '80px', fontFamily: 'inherit', color: '#5D4037' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={submitting || !commentText.trim()} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: commentText.trim() ? 'linear-gradient(135deg, #FF6B6B, #FFA07A)' : '#ccc', color: 'white', fontSize: '14px', fontWeight: '600', cursor: commentText.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Send size={16} /> Post Comment
                    </motion.button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255, 107, 107, 0.05)', borderRadius: '14px', marginBottom: '32px' }}>
              <p style={{ color: '#8D6E63', marginBottom: '10px' }}>Login to join the conversation</p>
              <Link to="/login"><motion.button whileHover={{ scale: 1.05 }} style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #FF6B6B, #FFA07A)', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Login</motion.button></Link>
            </div>
          )}

          {commentsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={32} color="#FF6B6B" style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#A1887F' }}>
              <MessageCircle size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  user={user}
                  onLike={handleLikeComment}
                  onReply={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  replyingTo={replyingTo}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  onReplySubmit={handleReplySubmit}
                  submitting={submitting}
                  onDelete={handleDeleteComment}
                  onDeleteReply={handleDeleteReply}
                />
              ))}
            </div>
          )}
        </div>
      </motion.section>

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        title="Delete Article"
        message="Are you sure you want to delete this article? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
        loading={deleteLoading}
      />
    </motion.div>
  );
};

const CommentItem = ({ comment, user, onLike, onReply, replyingTo, replyText, setReplyText, onReplySubmit, submitting, onDelete, onDeleteReply }) => {
  const [showReplies, setShowReplies] = useState(false);
  const isOwner = user && comment.author_id === user.id;
  const isLiked = user && comment.liked_by?.includes(user.id);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ padding: '16px', background: 'rgba(255, 107, 107, 0.03)', borderRadius: '16px', border: '1px solid rgba(255, 107, 107, 0.08)' }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B6B, #FFA07A)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#5D4037' }}>{comment.author_username || 'Anonymous'}</span>
            <span style={{ fontSize: '12px', color: '#A1887F' }}>{new Date(comment.created_at).toLocaleDateString()}</span>
          </div>
          <p style={{ fontSize: '14px', color: '#5D4037', lineHeight: 1.6, marginBottom: '12px' }}>{comment.content}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <motion.button onClick={() => onLike(comment.id)} whileHover={{ scale: 1.1 }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: isLiked ? 'rgba(255, 107, 107, 0.1)' : 'transparent', color: isLiked ? '#FF6B6B' : '#A1887F', fontSize: '13px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }}>
              <Heart size={16} fill={isLiked ? '#FF6B6B' : 'none'} /> {comment.likes || 0}
            </motion.button>
            <motion.button onClick={() => user ? onReply() : toast.info('Please login to reply')} whileHover={{ scale: 1.1 }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: replyingTo === comment.id ? 'rgba(255, 107, 107, 0.1)' : 'transparent', color: replyingTo === comment.id ? '#FF6B6B' : '#A1887F', fontSize: '13px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s' }}>
              <Reply size={16} /> Reply
            </motion.button>
            {comment.replies && comment.replies.length > 0 && (
              <motion.button onClick={() => setShowReplies(!showReplies)} whileHover={{ scale: 1.1 }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#A1887F', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                <MessageCircle size={16} /> {showReplies ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </motion.button>
            )}
            {isOwner && (
              <motion.button onClick={() => onDelete(comment.id)} whileHover={{ scale: 1.1 }} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#A1887F', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {replyingTo === comment.id && (
        <form onSubmit={(e) => onReplySubmit(e, comment.id)} style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '2px solid #FFE4D6', fontSize: '13px', resize: 'none', minHeight: '60px', fontFamily: 'inherit', color: '#5D4037' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <motion.button type="submit" whileHover={{ scale: 1.02 }} disabled={submitting || !replyText.trim()} style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: replyText.trim() ? 'linear-gradient(135deg, #FF6B6B, #FFA07A)' : '#ccc', color: 'white', fontSize: '13px', fontWeight: '600', cursor: replyText.trim() ? 'pointer' : 'not-allowed' }}>
              <Send size={14} />
            </motion.button>
            <motion.button type="button" onClick={() => { setReplyingTo(null); setReplyText(''); }} whileHover={{ scale: 1.02 }} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #FFE4D6', background: 'white', color: '#8D6E63', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
              <X size={14} />
            </motion.button>
          </div>
        </form>
      )}

      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div style={{ marginTop: '16px', marginLeft: '48px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {comment.replies.map((reply) => (
            <div key={reply.id} style={{ display: 'flex', gap: '10px', padding: '12px', background: 'rgba(255, 255, 255, 0.6)', borderRadius: '12px', position: 'relative' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #FFA07A, #FFD93D)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#5D4037' }}>{reply.author_username || 'Anonymous'}</span>
                  <span style={{ fontSize: '11px', color: '#A1887F' }}>{new Date(reply.created_at).toLocaleDateString()}</span>
                  {user && (
                    <motion.button onClick={() => onDeleteReply(reply.id, comment.id)} whileHover={{ scale: 1.1 }} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#A1887F', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </motion.button>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: '#5D4037', lineHeight: 1.5 }}>{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const EditArticlePage = () => {
  const { slug } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', tags: '', category_id: '' });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    categoriesAPI.getAll().then(res => setCategories(res.data || [])).catch(() => { });

    articlesAPI.getBySlug(slug)
      .then(res => {
        const a = res.data;
        setArticle(a);
        setForm({
          title: a.title,
          content: a.content,
          tags: a.tags?.join(', ') || '',
          category_id: a.category_id || '',
        });
      })
      .catch(err => {
        console.error('Failed to load article:', err);
        setError(err.response?.data?.detail || 'Article not found');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const validate = () => {
    const newErrors = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';
    if (!form.content.trim()) newErrors.content = 'Content is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await articlesAPI.update(article.id, {
        title: form.title,
        content: form.content,
        category_id: form.category_id || null,
        tags: form.tags.split(',').map(t => t.trim()).filter(t => t),
      });
      toast.success('Article updated!');
      navigate(`/articles/${article.slug}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update article');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Spinner size={48} /></div>;
  if (error) return <EmptyState icon={BookOpen} title="Error" message={error} action={{ label: 'Browse Articles', path: '/articles' }} />;
  if (!article) return <EmptyState icon={BookOpen} title="Article not found" message="The article you're looking for doesn't exist" action={{ label: 'Browse Articles', path: '/articles' }} />;

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition} style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
      <Breadcrumbs items={[{ label: 'Home', path: '/' }, { label: 'Articles', path: '/articles' }, { label: 'Edit' }]} />

      <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#5D4037', marginBottom: '32px', textAlign: 'center' }}>Edit Article</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ background: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 8px 32px rgba(252, 182, 159, 0.1)', border: '1px solid rgba(255, 107, 107, 0.1)' }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#5D4037' }}>Title *</label>
            <input type="text" value={form.title} onChange={e => { setForm({ ...form, title: e.target.value }); setErrors({ ...errors, title: '' }); }} style={{ width: '100%', padding: '16px', fontSize: '18px', border: `2px solid ${errors.title ? '#FF6B6B' : '#FFE4D6'}`, borderRadius: '12px', outline: 'none', boxSizing: 'border-box' }} />
            {errors.title && <p style={{ color: '#FF6B6B', fontSize: '12px', marginTop: '6px' }}>{errors.title}</p>}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#5D4037' }}>Category</label>
            <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} style={{ width: '100%', padding: '14px 16px', fontSize: '15px', border: '2px solid #FFE4D6', borderRadius: '12px', outline: 'none', background: 'white' }}>
              <option value="">Select a category</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#5D4037' }}>Content *</label>
            <textarea value={form.content} onChange={e => { setForm({ ...form, content: e.target.value }); setErrors({ ...errors, content: '' }); }} rows={12} style={{ width: '100%', padding: '16px', fontSize: '15px', border: `2px solid ${errors.content ? '#FF6B6B' : '#FFE4D6'}`, borderRadius: '12px', outline: 'none', boxSizing: 'border-box', resize: 'vertical', minHeight: '200px', fontFamily: 'inherit', lineHeight: 1.6 }} />
            {errors.content && <p style={{ color: '#FF6B6B', fontSize: '12px', marginTop: '6px' }}>{errors.content}</p>}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#5D4037' }}>Tags</label>
            <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="tag1, tag2, tag3" style={{ width: '100%', padding: '14px 16px', fontSize: '15px', border: '2px solid #FFE4D6', borderRadius: '12px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <motion.button type="button" whileHover={{ scale: 1.02 }} onClick={() => navigate(-1)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '2px solid #FFE4D6', background: 'white', color: '#5D4037', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
              Cancel
            </motion.button>
            <motion.button type="submit" whileHover={{ scale: 1.02 }} disabled={saving} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: saving ? '#ccc' : 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)', color: 'white', fontSize: '15px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Save Changes'}
            </motion.button>
          </div>
        </div>
      </form>
    </motion.div>
  );
};

const ProfilePage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      articlesAPI.getAll({ author: user.id, limit: 50 })
        .then(res => setArticles(res.data.items || []))
        .catch(() => toast.error('Failed to load your articles'))
        .finally(() => setLoading(false));
    }
  }, [user]);

  if (!user) {
    return (
      <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition} style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <EmptyState icon={User} title="Sign in required" message="Please sign in to view your profile" action={{ label: 'Sign In', path: '/login' }} />
      </motion.div>
    );
  }

  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} transition={pageTransition} style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
      <Breadcrumbs items={[{ label: 'Home', path: '/' }, { label: 'Profile' }]} />

      <div style={{ background: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 8px 32px rgba(252, 182, 159, 0.1)', border: '1px solid rgba(255, 107, 107, 0.1)', marginBottom: '40px', textAlign: 'center' }}>
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B6B, #FFA07A)', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={48} color="white" />
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#5D4037', marginBottom: '8px' }}>{user.username}</h1>
        <p style={{ fontSize: '16px', color: '#8D6E63', marginBottom: '0' }}>{user.email}</p>
      </div>

      <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#5D4037', marginBottom: '24px' }}>Your Articles</h2>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : articles.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {articles.map((article, i) => (
            <motion.div key={article.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -6 }}>
              <Link to={`/articles/${article.slug}`}>
                <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(93, 64, 55, 0.12)', border: '1px solid #FFE4D6', height: '100%', cursor: 'pointer' }}>
                  <div style={{ padding: '20px' }}>
                    <span style={{ display: 'inline-block', padding: '4px 10px', background: 'rgba(255, 107, 107, 0.1)', color: '#FF6B6B', borderRadius: '16px', fontSize: '11px', fontWeight: '600', marginBottom: '12px' }}>{article.category_name || 'General'}</span>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#5D4037', marginBottom: '8px' }}>{article.title}</h3>
                    <p style={{ fontSize: '13px', color: '#8D6E63' }}>{article.view_count || 0} views</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <EmptyState icon={PenLine} title="No articles yet" message="Start writing and share your stories with the world!" action={{ label: 'Write Your First Article', path: '/write' }} />
      )}
    </motion.div>
  );
};

const App = () => (
  <BrowserRouter>
    <GlobalStyles />
    <ToastProvider>
      <AuthProvider>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar />
          <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><Spinner size={48} /></div>}>
            <main style={{ flex: 1 }}>
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/articles" element={<ArticlesPage />} />
                  <Route path="/articles/:slug" element={<ArticleDetailPage />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/categories/:slug" element={<CategoryArticlesPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/write" element={<WritePage />} />
                  <Route path="/edit/:slug" element={<EditArticlePage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Routes>
              </AnimatePresence>
            </main>
          </Suspense>
          <Footer />
        </div>
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>
);

export default App;
