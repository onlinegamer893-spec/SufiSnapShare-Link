import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Trash2, 
  ExternalLink, 
  Send, 
  Copy, 
  Check, 
  Eye, 
  Clock, 
  ArrowLeft, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  BarChart3,
  Layers
} from 'lucide-react';
import { PhotoRecord } from '../types';
import { safeFetchJson } from '../utils/api';

interface AdminDashboardProps {
  onBack: () => void;
  onViewPhoto: (id: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, onViewPhoto }) => {
  const [password, setPassword] = useState<string>('');
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sufi_admin_token'));
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'photos' | 'guide'>('photos');

  // Stats and photo list
  const [stats, setStats] = useState<any>(null);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingTelegram, setTestingTelegram] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchAdminData = async (authToken: string) => {
    setLoading(true);
    try {
      const data = await safeFetchJson<any>('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!data || !data.success) {
        setLoginError(data?.error || 'Failed to load admin stats.');
        return;
      }
      setStats(data.stats);
      setPhotos(data.photos || []);
    } catch (err: any) {
      if (err.message?.includes('401')) {
        localStorage.removeItem('sufi_admin_token');
        setToken(null);
        setLoginError('Session expired. Please enter password again.');
      } else {
        setLoginError(err.message || 'Connection error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAdminData(token);
    }
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    try {
      const data = await safeFetchJson<any>('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!data || !data.success) {
        throw new Error(data?.error || 'Invalid credentials');
      }
      setToken(data.token);
      localStorage.setItem('sufi_admin_token', data.token);
      fetchAdminData(data.token);
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sufi_admin_token');
    setToken(null);
    setStats(null);
    setPhotos([]);
  };

  const handleDeletePhoto = async (id: string) => {
    if (!token) return;
    try {
      const data = await safeFetchJson<any>(`/api/admin/photos/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data && data.success) {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
        if (stats) {
          setStats({ ...stats, totalPhotos: Math.max(0, stats.totalPhotos - 1) });
        }
        setDeleteConfirmId(null);
      }
    } catch (err: any) {
      console.error('Delete error:', err.message);
    }
  };

  const handleTestTelegram = async () => {
    if (!token) return;
    setTestingTelegram(true);
    setTestResult(null);
    try {
      const data = await safeFetchJson<any>('/api/admin/test-telegram', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (data && data.success) {
        setTestResult({ success: true, message: 'Ping delivered to Telegram Chat #8851455020!' });
      } else {
        setTestResult({ success: false, message: data?.error || 'Failed to ping Telegram' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Telegram connection failed' });
    } finally {
      setTestingTelegram(false);
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  const copyShortLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // If not logged in, show Password Prompt
  if (!token) {
    return (
      <div className="w-full max-w-[560px] mx-auto min-h-[calc(100vh-80px)] flex flex-col justify-center py-6 px-4">
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-cyan-500/20 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">SufiSnapShare Admin</h2>
              <p className="text-xs text-slate-400">Restricted authentication portal</p>
            </div>
          </div>

          {loginError && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Admin Secret Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password..."
                  required
                  className="w-full py-3.5 pl-11 pr-4 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400 transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Default password: <code className="text-cyan-300 bg-slate-800 px-1.5 py-0.5 rounded">sufi-admin-2026</code>
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Back to App
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[560px] mx-auto min-h-[calc(100vh-80px)] flex flex-col py-3 px-3 gap-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all shadow-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Admin</span>
        </button>

        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('photos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'photos'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Photos & Stats
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Firebase Docs
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-medium transition-all cursor-pointer"
        >
          Logout
        </button>
      </div>

      {activeTab === 'photos' ? (
        <>
          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Photos</span>
                <span className="text-xl font-black text-cyan-300 mt-1">{stats.totalPhotos}</span>
                <span className="text-[10px] text-slate-500">Live in vault</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Views</span>
                <span className="text-xl font-black text-blue-400 mt-1">{stats.totalViews}</span>
                <span className="text-[10px] text-slate-500">All short links</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col">
                <span className="text-[10px] uppercase font-bold text-slate-400">Telegram Sync</span>
                <span className="text-xl font-black text-emerald-400 mt-1">{stats.telegramSuccessCount}</span>
                <span className="text-[10px] text-slate-500">Delivered</span>
              </div>
            </div>
          )}

          {/* Telegram Bot Action & Status Card */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-cyan-500/20 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white">Telegram Integration</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                Chat ID: 8851455020
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <p className="text-[11px] text-slate-400">
                Bot Token: <code className="text-slate-300 font-mono">879164...BHqU</code> (Server-only secret)
              </p>
              <button
                onClick={handleTestTelegram}
                disabled={testingTelegram}
                className="py-1.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${testingTelegram ? 'animate-spin' : ''}`} />
                <span>{testingTelegram ? 'Testing...' : 'Send Test Ping'}</span>
              </button>
            </div>

            {testResult && (
              <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                testResult.success 
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Photos Management List */}
          <div className="flex-1 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Uploaded Photos ({photos.length})
              </span>
              <button
                onClick={() => token && fetchAdminData(token)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {photos.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 text-center flex flex-col items-center justify-center">
                <Layers className="w-10 h-10 text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-300">No photos uploaded yet</p>
                <p className="text-xs text-slate-500 mt-1">Take a camera snapshot or choose from gallery to get started.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 transition-all"
                  >
                    {/* Thumbnail */}
                    <div
                      onClick={() => onViewPhoto(photo.id)}
                      className="w-14 h-14 rounded-xl bg-slate-950 overflow-hidden border border-slate-800 shrink-0 cursor-pointer flex items-center justify-center"
                    >
                      <img
                        src={photo.imageUrl}
                        alt={photo.id}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-300">
                          {photo.id}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400">
                          {photo.views} views
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {new Date(photo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {(photo.size / 1024).toFixed(0)} KB
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[10px] font-semibold flex items-center gap-1 ${
                          photo.telegramSent ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          <Send className="w-2.5 h-2.5" />
                          {photo.telegramSent ? 'Telegram OK' : 'Telegram Pending'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => copyShortLink(photo.shortLink || `${window.location.origin}/s/${photo.id}`, photo.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
                        title="Copy short link"
                      >
                        {copiedId === photo.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => onViewPhoto(photo.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
                        title="View photo"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      {deleteConfirmId === photo.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="px-2 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(photo.id)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Firebase Setup & Docs Tab */
        <div className="flex-1 bg-slate-900/60 p-4 rounded-3xl border border-slate-800 overflow-y-auto max-h-[70vh] space-y-4 text-xs">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Firebase Deployment & Architecture</span>
            </h3>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Production configuration files generated in repository
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
              <p className="font-bold text-cyan-300 mb-1">1. Firestore Collection: /photos/{'{id}'}</p>
              <pre className="text-[10px] text-slate-300 overflow-x-auto bg-slate-900 p-2 rounded-lg font-mono">
{`{
  "id": "A7kP92x",
  "imageUrl": "https://storage.googleapis.com/.../photo.jpg",
  "createdAt": "2026-11-01T08:50:00Z",
  "status": "active",
  "views": 14,
  "telegramSent": true
}`}
              </pre>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
              <p className="font-bold text-cyan-300 mb-1">2. Telegram Server Secrets</p>
              <p className="text-slate-400 text-[11px]">
                Bot Token: <code className="text-emerald-300">8791640895:AAEgYDc4ZlEsAqUdE5vqKohYq0rnj4-BHqU</code>
                <br />
                Chat ID: <code className="text-emerald-300">8851455020</code>
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
              <p className="font-bold text-cyan-300 mb-1">3. Firebase Files Available</p>
              <ul className="list-disc list-inside text-slate-300 space-y-1">
                <li><code className="text-cyan-400">/firebase/firestore.rules</code> - Security rules</li>
                <li><code className="text-cyan-400">/firebase/storage.rules</code> - Storage mime/size enforcement</li>
                <li><code className="text-cyan-400">/firebase/firebase.json</code> - /s/:id Hosting rewrites</li>
                <li><code className="text-cyan-400">/firebase/functions/index.js</code> - Cloud Function for Telegram</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
