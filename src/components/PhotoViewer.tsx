import React, { useEffect, useState } from 'react';
import { 
  Download, 
  Share2, 
  Copy, 
  Check, 
  Eye, 
  Clock, 
  ArrowLeft, 
  Camera, 
  AlertCircle, 
  Sparkles, 
  ShieldAlert, 
  CheckCircle2,
  FileCheck,
  Maximize2
} from 'lucide-react';
import { PhotoRecord } from '../types';
import { safeFetchJson } from '../utils/api';
import { getPhotoFromLocalVault } from '../utils/vault';

interface PhotoViewerProps {
  photoId: string;
  onGoHome: () => void;
  onOpenSelfieReply: () => void;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({ 
  photoId, 
  onGoHome, 
  onOpenSelfieReply 
}) => {
  const [photo, setPhoto] = useState<PhotoRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const fetchPhoto = async () => {
      setLoading(true);
      setError(null);
      try {
        try {
          const data = await safeFetchJson<{ success: boolean; photo: PhotoRecord }>(`/api/photos/${photoId}`);
          if (data && data.success && data.photo && isMounted) {
            setPhoto(data.photo);
            return;
          }
        } catch (apiErr: any) {
          console.warn('API lookup issue, checking local vault cache:', apiErr.message);
        }

        // Fallback to local vault
        const localPhoto = getPhotoFromLocalVault(photoId);
        if (localPhoto && isMounted) {
          setPhoto(localPhoto);
        } else if (isMounted) {
          setError('Photo not found or link has expired.');
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Unable to load photo.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPhoto();

    return () => {
      isMounted = false;
    };
  }, [photoId]);

  const shortLink = photo?.shortLink || `${window.location.origin}/s/${photoId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shortLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shortLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `SufiSnapShare Photo • ${photoId}`,
          text: 'View this shared photo on SufiSnapShare:',
          url: shortLink,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownload = async () => {
    if (!photo) return;
    setDownloading(true);
    try {
      const res = await fetch(photo.imageUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sufisnap-${photoId}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(photo.imageUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full max-w-[560px] mx-auto min-h-[calc(100vh-80px)] flex flex-col justify-between py-3 px-3">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3">
        <button
          onClick={onGoHome}
          className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all shadow-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>

        <span className="text-xs font-mono text-cyan-400 font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30">
          ID: {photoId}
        </span>

        <button
          onClick={handleCopyLink}
          className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-cyan-300 transition-all shadow-md cursor-pointer"
          title="Copy short link"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center">
        {loading && (
          <div className="w-full aspect-[4/5] rounded-3xl bg-slate-900/50 border border-slate-800 flex flex-col items-center justify-center p-6">
            <div className="w-12 h-12 border-3 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-white">Retrieving photo vault...</p>
            <p className="text-xs text-slate-400 mt-1">Verifying short ID {photoId}</p>
          </div>
        )}

        {error && !loading && (
          <div className="w-full aspect-[4/5] rounded-3xl bg-slate-900/60 border border-rose-500/30 p-6 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Photo Unavailable</h3>
            <p className="text-xs text-slate-300 max-w-xs mb-6 leading-relaxed">
              {error} The link might be invalid, or the owner removed the image.
            </p>
            <button
              onClick={onGoHome}
              className="py-3 px-6 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/25 cursor-pointer"
            >
              Go to SufiSnapShare Home
            </button>
          </div>
        )}

        {photo && !loading && (
          <div className="flex flex-col gap-3">
            {/* Viewer Image Box - strict requirement: object-fit: contain, never crop or stretch */}
            <div className="relative w-full min-h-[300px] max-h-[70vh] bg-slate-950 rounded-3xl overflow-hidden border border-cyan-500/30 shadow-2xl flex items-center justify-center p-1">
              <img
                src={photo.imageUrl}
                alt={`Photo ${photo.id}`}
                className="w-full h-auto max-h-[68vh] object-contain rounded-2xl"
              />

              <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-[11px] font-medium text-slate-300 flex items-center gap-1.5 pointer-events-none">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>{photo.views} {photo.views === 1 ? 'view' : 'views'}</span>
              </div>
            </div>

            {/* Photo Metadata Card */}
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>{formatDate(photo.createdAt)}</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                Original Quality
              </span>
            </div>

            {/* Viewer action: Reply with selfie (Strict Consent system - Requirement 6 & 8) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/40 to-slate-900/60 border border-cyan-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Reply with a Photo?</p>
                  <p className="text-[10px] text-slate-400">Share your reaction selfie securely</p>
                </div>
              </div>
              <button
                onClick={() => setShowConsentModal(true)}
                className="py-2 px-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
              >
                Take Selfie
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Viewer Action Buttons */}
      {photo && !loading && (
        <div className="pt-4 pb-2 flex items-center gap-2.5">
          {/* Download Photo */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-3.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>{downloading ? 'Downloading...' : 'Download'}</span>
          </button>

          {/* Share Photo */}
          <button
            onClick={handleShare}
            className="flex-1 py-3.5 px-3 rounded-2xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-cyan-400" />
            <span>Share</span>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className={`flex-1 py-3.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-950" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Viewer Explicit Consent Modal (Requirement 8) */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#0d1426] border border-cyan-500/30 p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Camera Privacy Notice</h3>
                <p className="text-[11px] text-cyan-300/80">Viewer Consent System</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-2 leading-relaxed bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>Camera will be activated <strong>only after you click Proceed</strong>.</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>No video or microphone is recorded secretly.</span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span>You will review the captured photo before deciding to share it.</span>
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                onClick={() => setShowConsentModal(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConsentModal(false);
                  onOpenSelfieReply();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/25 transition-all cursor-pointer"
              >
                Proceed to Camera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
