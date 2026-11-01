import React, { useEffect, useRef, useState } from 'react';
import { 
  Camera, 
  RotateCcw, 
  SwitchCamera, 
  FlipHorizontal, 
  X, 
  Check, 
  Timer, 
  AlertCircle,
  Sparkles,
  Zap
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface CameraViewProps {
  onCapture: (imageDataUrl: string, fileName: string) => void;
  onCancel: () => void;
  onSwitchToGallery: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({ onCapture, onCancel, onSwitchToGallery }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(true);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [countdownEnabled, setCountdownEnabled] = useState<boolean>(true);

  // Stop camera tracks helper
  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
  };

  // Start camera stream
  const startCamera = async (mode: 'user' | 'environment') => {
    setIsLoadingCamera(true);
    setPermissionError(null);
    stopTracks();

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsLoadingCamera(false);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsLoadingCamera(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Camera permission was denied. Please allow camera access in your browser settings to take a photo.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('No camera found on this device.');
      } else {
        setPermissionError(err.message || 'Unable to access camera.');
      }
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopTracks();
    };
  }, [facingMode]);

  // Flip front/rear camera
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    // When switching to rear, default mirrored off; when front, mirrored on
    setIsMirrored(nextMode === 'user');
  };

  // Initiate capture (with countdown if enabled)
  const triggerCapture = () => {
    if (countdown !== null) return;

    if (!countdownEnabled) {
      performSnap();
      return;
    }

    setCountdown(3);
    sounds.playCountdownBeep(660);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) {
          clearInterval(interval);
          return null;
        }
        if (prev > 1) {
          sounds.playCountdownBeep(prev === 2 ? 770 : 880);
          return prev - 1;
        }
        clearInterval(interval);
        performSnap();
        return null;
      });
    }, 1000);
  };

  // Actual snapshot drawing
  const performSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Trigger flash animation
    setFlashActive(true);
    sounds.playShutterSound();
    setTimeout(() => setFlashActive(false), 250);

    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    // Apply mirror if front camera and mirror mode is active
    if (facingMode === 'user' && isMirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);

    // Pause stream while reviewing
    stopTracks();
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  // Confirm photo
  const handleConfirm = () => {
    if (!capturedImage) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    onCapture(capturedImage, `sufisnap-${timestamp}.jpg`);
  };

  const handleClose = () => {
    stopTracks();
    onCancel();
  };

  return (
    <div className="w-full max-w-[560px] mx-auto min-h-[calc(100vh-80px)] flex flex-col justify-between py-2 px-3">
      {/* Top Bar Controls */}
      <div className="flex items-center justify-between pb-3">
        <button
          onClick={handleClose}
          className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all shadow-md"
          title="Close camera"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {/* Countdown Mode Toggle */}
          <button
            onClick={() => setCountdownEnabled(!countdownEnabled)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all ${
              countdownEnabled
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/20'
                : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle 3-second countdown"
          >
            <Timer className="w-3.5 h-3.5" />
            <span>3s Timer</span>
          </button>

          {/* Mirror Toggle (Front Cam Only) */}
          {facingMode === 'user' && !capturedImage && (
            <button
              onClick={() => setIsMirrored(!isMirrored)}
              className={`p-2.5 rounded-full border transition-all ${
                isMirrored
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-slate-900/80 border-slate-700/60 text-slate-400'
              }`}
              title={isMirrored ? 'Mirrored Preview ON' : 'Mirrored Preview OFF'}
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          )}

          {/* Switch Camera */}
          {!capturedImage && (
            <button
              onClick={handleToggleFacingMode}
              disabled={isLoadingCamera}
              className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-cyan-300 transition-all shadow-md active:rotate-180"
              title="Switch front / rear camera"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Viewport Frame */}
      <div className="relative w-full aspect-[3/4] sm:aspect-[4/5] bg-slate-950 rounded-3xl overflow-hidden border border-cyan-500/20 shadow-2xl flex items-center justify-center">
        {/* Flash overlay */}
        {flashActive && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-out fade-out duration-300" />
        )}

        {/* Permission Error State */}
        {permissionError && (
          <div className="absolute inset-0 z-30 p-6 flex flex-col items-center justify-center text-center bg-slate-950/95">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Camera Access Required</h3>
            <p className="text-sm text-slate-300 mb-6 max-w-sm leading-relaxed">
              {permissionError}
            </p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={() => startCamera(facingMode)}
                className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/25 cursor-pointer"
              >
                Grant Permission & Try Again
              </button>
              <button
                onClick={onSwitchToGallery}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm transition-all"
              >
                Choose Photo from Gallery Instead
              </button>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoadingCamera && !permissionError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80">
            <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-3" />
            <p className="text-xs font-medium text-cyan-300">Initializing camera...</p>
          </div>
        )}

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs">
            <div className="w-28 h-28 rounded-full bg-cyan-500/30 border-2 border-cyan-400 text-white flex items-center justify-center shadow-2xl animate-pulse">
              <span className="text-6xl font-black tracking-tight text-white drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]">
                {countdown}
              </span>
            </div>
          </div>
        )}

        {/* Live Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover transition-transform duration-200 ${
            facingMode === 'user' && isMirrored ? 'scale-x-[-1]' : ''
          } ${capturedImage ? 'hidden' : 'block'}`}
        />

        {/* Captured Image Preview */}
        {capturedImage && (
          <div className="absolute inset-0 z-10 bg-black flex items-center justify-center">
            <img
              src={capturedImage}
              alt="Captured preview"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 text-[11px] font-semibold text-cyan-300 flex items-center gap-1.5 shadow-lg">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Photo Captured</span>
            </div>
          </div>
        )}

        {/* Camera Grid Guideline Overlay */}
        {!capturedImage && !permissionError && !isLoadingCamera && (
          <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20">
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-r border-b border-white" />
            <div className="border-b border-white" />
            <div className="border-r border-white" />
            <div className="border-r border-white" />
            <div />
          </div>
        )}
      </div>

      {/* Bottom Controls / Action Bar */}
      <div className="pt-4 pb-2">
        {!capturedImage ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-6 w-full">
              {/* Switch to gallery */}
              <button
                onClick={onSwitchToGallery}
                className="px-4 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-all"
              >
                Gallery
              </button>

              {/* Shutter Button */}
              <button
                onClick={triggerCapture}
                disabled={isLoadingCamera || !!permissionError}
                className="relative group p-1 rounded-full cursor-pointer focus:outline-none disabled:opacity-50"
                title="Capture Photo"
              >
                {/* Glow ring */}
                <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-20 h-20 rounded-full border-4 border-cyan-300/80 bg-slate-950 flex items-center justify-center shadow-xl group-hover:scale-105 active:scale-95 transition-all">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-inner group-hover:brightness-110" />
                </div>
              </button>

              {/* Facing mode badge */}
              <div className="px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/70 text-slate-400 text-xs font-medium">
                {facingMode === 'user' ? 'Front Cam' : 'Rear Cam'}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 font-medium text-center">
              Tap shutter to take photo {countdownEnabled ? 'with 3s timer' : 'instantly'}
            </p>
          </div>
        ) : (
          /* Review Bar */
          <div className="flex items-center gap-3">
            <button
              onClick={handleRetake}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>Retake Photo</span>
            </button>

            <button
              onClick={handleConfirm}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Use & Share</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
