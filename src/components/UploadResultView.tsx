import React, { useState } from 'react';
import { 
  Check, 
  Copy, 
  Share2, 
  Download, 
  MessageCircle, 
  ExternalLink, 
  PlusCircle, 
  Sparkles, 
  Send,
  Eye,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface UploadResultViewProps {
  photoId: string;
  shortLink: string;
  imageUrl: string;
  createdAt: string;
  onNewPhoto: () => void;
  onViewPhoto: (id: string) => void;
}

export const UploadResultView: React.FC<UploadResultViewProps> = ({
  photoId,
  shortLink,
  imageUrl,
  createdAt,
  onNewPhoto,
  onViewPhoto,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Requirement: Copy Link must copy ONLY the short URL
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shortLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
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

  // Requirement 10: WhatsApp sharing -> https://wa.me/?text=ENCODED_SHORT_LINK
  const handleWhatsAppShare = () => {
    const message = `Check out this photo on SufiSnapShare: ${shortLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Native Web Share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SufiSnapShare Photo',
          text: 'Check out this photo on SufiSnapShare!',
          url: shortLink,
        });
        setShareFeedback('Shared successfully!');
        setTimeout(() => setShareFeedback(null), 2000);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // Download high-resolution photo
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sufisnap-${photoId}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      window.open(imageUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-[560px] mx-auto min-h-[calc(100vh-80px)] flex flex-col justify-between py-4 px-3">
      <div className="flex flex-col gap-4">
        {/* Success Header Card */}
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border border-emerald-500/25 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                Upload Successful!
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </h2>
              <p className="text-[11px] text-emerald-300/90 font-medium">
                Photo vault secured • Short link generated
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-bold tracking-wide text-emerald-300">
            ACTIVE
          </span>
        </div>

        {/* Full Photo Preview */}
        <div className="relative w-full aspect-[4/5] sm:aspect-[4/4] bg-slate-950 rounded-3xl overflow-hidden border border-cyan-500/30 shadow-2xl flex items-center justify-center group">
          <img
            src={imageUrl}
            alt="Uploaded Photo"
            className="w-full h-full object-contain"
          />

          {/* Quick Overlay action */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={() => onViewPhoto(photoId)}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md shadow-md transition-all cursor-pointer"
              title="Open viewer page"
            >
              <Eye className="w-4 h-4" />
              <span>View Full</span>
            </button>
          </div>

          <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 text-[11px] font-mono text-cyan-300">
            ID: {photoId}
          </div>
        </div>

        {/* Short Share Link Card */}
        <div className="p-4 rounded-3xl bg-slate-900/70 border border-cyan-500/20 shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
              <Share2 className="w-3.5 h-3.5" />
              Your Unique Short Link
            </span>
            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Just now
            </span>
          </div>

          {/* Short Link display and Copy button */}
          <div className="flex items-center gap-2 p-1.5 pl-3 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span className="text-xs font-mono text-cyan-300 select-all truncate flex-1 font-medium">
              {shortLink}
            </span>
            <button
              onClick={handleCopyLink}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Share Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* WhatsApp */}
            <button
              onClick={handleWhatsAppShare}
              className="py-3 px-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp Share</span>
            </button>

            {/* Native Share */}
            <button
              onClick={handleNativeShare}
              className="py-3 px-3 rounded-2xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span>Native Share</span>
            </button>
          </div>

          {/* Telegram Status Badge */}
          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                <Send className="w-3 h-3" />
              </div>
              <span className="text-[11px] text-slate-300 font-medium">Telegram Cloud Bot</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Photo & Link Dispatched
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Nav Actions */}
      <div className="pt-4 pb-2 flex items-center gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>{downloading ? 'Downloading...' : 'Download Photo'}</span>
        </button>

        <button
          onClick={onNewPhoto}
          className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-slate-950" />
          <span>New Photo</span>
        </button>
      </div>
    </div>
  );
};
