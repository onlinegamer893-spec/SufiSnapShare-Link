import React, { useEffect, useState } from 'react';
import { 
  Camera, 
  UploadCloud, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Image as ImageIcon, 
  Send, 
  Share2, 
  Lock, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  Sliders,
  Heart
} from 'lucide-react';

import { AppView, UploadResponse } from './types';
import { Navbar } from './components/Navbar';
import { CameraView } from './components/CameraView';
import { GalleryUploadView } from './components/GalleryUploadView';
import { UploadResultView } from './components/UploadResultView';
import { PhotoViewer } from './components/PhotoViewer';
import { AdminDashboard } from './components/AdminDashboard';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);

  // Uploading Progress State
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgressStage, setUploadProgressStage] = useState<string>('Preparing...');
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Check admin session
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('sufi_admin_token'));
  });

  // Client Routing from URL (supports /s/:id and /admin)
  useEffect(() => {
    const handleRouteFromUrl = () => {
      const path = window.location.pathname;
      const shortMatch = path.match(/^\/s\/([a-zA-Z0-9]+)/);
      if (shortMatch) {
        const id = shortMatch[1];
        setActivePhotoId(id);
        setCurrentView('viewer');
      } else if (path === '/admin') {
        setCurrentView('admin');
      } else if (currentView === 'viewer' || currentView === 'admin') {
        setCurrentView('home');
      }
    };

    handleRouteFromUrl();

    window.addEventListener('popstate', handleRouteFromUrl);
    return () => {
      window.removeEventListener('popstate', handleRouteFromUrl);
    };
  }, []);

  const navigateTo = (view: AppView, photoId?: string) => {
    setCurrentView(view);
    if (view === 'viewer' && photoId) {
      setActivePhotoId(photoId);
      window.history.pushState(null, '', `/s/${photoId}`);
    } else if (view === 'admin') {
      window.history.pushState(null, '', '/admin');
    } else if (view === 'home') {
      window.history.pushState(null, '', '/');
    }
  };

  // Perform Real Upload to Server
  const handlePerformUpload = async (imageDataUrl: string, fileName: string) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadPercent(15);
    setUploadProgressStage('Validating original image data...');

    // Extract MIME
    let mimeType = 'image/jpeg';
    const mimeMatch = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9\.\+-]+);base64,/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }

    try {
      setUploadPercent(40);
      setUploadProgressStage('Uploading to SufiSnapShare vault...');

      // Small tick for smooth progress
      setTimeout(() => {
        setUploadPercent(70);
        setUploadProgressStage('Generating unique short link & notifying Telegram...');
      }, 300);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData: imageDataUrl,
          fileName: fileName,
          mimeType: mimeType,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed.');
      }

      setUploadPercent(100);
      setUploadProgressStage('Complete!');

      setTimeout(() => {
        setUploadResult({
          success: true,
          id: data.id,
          shortLink: data.shortLink,
          imageUrl: data.imageUrl,
          createdAt: data.createdAt,
          status: data.status,
        });
        setActivePhotoId(data.id);
        setCurrentView('result');
        setIsUploading(false);
      }, 400);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setIsUploading(false);
      setUploadError(err.message || 'Server error while uploading. Please check connection.');
    }
  };

  return (
    <div className="min-h-screen bg-[#080d1c] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => navigateTo(view)}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* Uploading Progress Modal Overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#0d1426] border border-cyan-500/30 p-6 shadow-2xl flex flex-col items-center text-center">
            {/* Spinning Radiant Ring */}
            <div className="relative w-16 h-16 mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
              <div className="relative w-14 h-14 rounded-full border-3 border-cyan-500/30 border-t-cyan-400 animate-spin flex items-center justify-center">
                <Zap className="w-6 h-6 text-cyan-400" />
              </div>
            </div>

            <h3 className="text-base font-bold text-white mb-1">Uploading Photo</h3>
            <p className="text-xs text-slate-400 mb-5">{uploadProgressStage}</p>

            {/* Progress bar */}
            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800 p-0.5 mb-2">
              <div 
                className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-300 shadow-sm shadow-cyan-400/50"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-mono font-semibold text-cyan-300">
              {uploadPercent}%
            </span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[560px] mx-auto px-4 py-3 flex flex-col">
        {/* Upload error alert if occurred */}
        {uploadError && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <span>{uploadError}</span>
            <button
              onClick={() => setUploadError(null)}
              className="text-rose-400 hover:text-white font-bold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* VIEW ROUTER */}
        {currentView === 'home' && (
          <div className="flex-1 flex flex-col justify-between py-4 animate-in fade-in duration-300">
            {/* Hero Section */}
            <div className="flex flex-col items-center text-center mt-2 mb-6">
              {/* Feature Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold mb-4 shadow-sm shadow-cyan-500/10">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Genuine Short Links • Instant Telegram Sync</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 leading-tight">
                Capture & Share <br />
                <span className="text-gradient-cyan">In Pure Magic.</span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Take a high-res shot with our camera or upload from your gallery. 
                Get a lightning-fast short link with zero quality compression.
              </p>
            </div>

            {/* Main Action Buttons (Requirement 2) */}
            <div className="flex flex-col gap-3.5 mb-6">
              {/* Button 1: Open Camera */}
              <button
                onClick={() => setCurrentView('camera')}
                className="group relative p-5 rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-cyan-500/30 hover:border-cyan-400/80 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300 text-left flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform shrink-0">
                    <Camera className="w-7 h-7 stroke-[2.2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                        1. Open Camera
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">
                        LIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Front & rear camera • 3-2-1 timer • Mirrored preview
                    </p>
                  </div>
                </div>

                <div className="w-9 h-9 rounded-full bg-slate-800/80 group-hover:bg-cyan-500 group-hover:text-slate-950 text-slate-400 flex items-center justify-center transition-all shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              {/* Button 2: Choose Photo */}
              <button
                onClick={() => setCurrentView('gallery')}
                className="group relative p-5 rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800 hover:border-cyan-500/60 shadow-xl hover:shadow-cyan-500/15 transition-all duration-300 text-left flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                        2. Choose Photo
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-semibold">
                        GALLERY
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports JPG, PNG, WEBP • Preserves full resolution
                    </p>
                  </div>
                </div>

                <div className="w-9 h-9 rounded-full bg-slate-800/80 group-hover:bg-cyan-500 group-hover:text-slate-950 text-slate-400 flex items-center justify-center transition-all shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>

            {/* Quality and Tech Highlights */}
            <div className="p-4 rounded-3xl bg-slate-900/40 border border-slate-800/80 grid grid-cols-2 gap-3 text-left">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Genuine /s/:id Links</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Clean short URLs for WhatsApp, Telegram & Discord</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Telegram Cloud Bot</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Automated delivery directly to your configured channel</p>
                </div>
              </div>
            </div>

            {/* Footer notice */}
            <div className="text-center pt-4">
              <p className="text-[10px] text-slate-500 font-medium">
                SufiSnapShare • Production Ready • Mobile-First Engine
              </p>
            </div>
          </div>
        )}

        {currentView === 'camera' && (
          <CameraView
            onCapture={(dataUrl, fileName) => handlePerformUpload(dataUrl, fileName)}
            onCancel={() => navigateTo('home')}
            onSwitchToGallery={() => setCurrentView('gallery')}
          />
        )}

        {currentView === 'gallery' && (
          <GalleryUploadView
            onFileSelected={(dataUrl, fileName) => handlePerformUpload(dataUrl, fileName)}
            onCancel={() => navigateTo('home')}
            onOpenFreshCamera={() => setCurrentView('camera')}
          />
        )}

        {currentView === 'result' && uploadResult && (
          <UploadResultView
            photoId={uploadResult.id}
            shortLink={uploadResult.shortLink}
            imageUrl={uploadResult.imageUrl}
            createdAt={uploadResult.createdAt}
            onNewPhoto={() => navigateTo('home')}
            onViewPhoto={(id) => navigateTo('viewer', id)}
          />
        )}

        {currentView === 'viewer' && activePhotoId && (
          <PhotoViewer
            photoId={activePhotoId}
            onGoHome={() => navigateTo('home')}
            onOpenSelfieReply={() => setCurrentView('camera')}
          />
        )}

        {currentView === 'admin' && (
          <AdminDashboard
            onBack={() => navigateTo('home')}
            onViewPhoto={(id) => navigateTo('viewer', id)}
          />
        )}
      </main>
    </div>
  );
}
