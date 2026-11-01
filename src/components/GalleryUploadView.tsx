import React, { useRef, useState } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  X, 
  Check, 
  AlertCircle, 
  Sparkles, 
  FileCheck, 
  Info,
  ArrowLeft 
} from 'lucide-react';

interface GalleryUploadViewProps {
  onFileSelected: (imageDataUrl: string, fileName: string, file: File) => void;
  onCancel: () => void;
  onOpenFreshCamera: () => void;
}

export const GalleryUploadView: React.FC<GalleryUploadViewProps> = ({ 
  onFileSelected, 
  onCancel,
  onOpenFreshCamera 
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; type: string } | null>(null);

  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const validateAndProcessFile = (file: File) => {
    setErrorMessage(null);

    const fileType = file.type.toLowerCase();
    if (!supportedTypes.includes(fileType)) {
      setErrorMessage('Unsupported file format. Please choose a JPG, PNG, or WEBP image.');
      return;
    }

    // 25MB max limit
    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage('File size is too large. SufiSnapShare supports photos up to 25MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setSelectedPreview(dataUrl);
      setSelectedFile(file);

      // Measure dimensions
      const img = new Image();
      img.onload = () => {
        let orientation = 'Square';
        if (img.naturalWidth > img.naturalHeight) orientation = 'Landscape';
        else if (img.naturalHeight > img.naturalWidth) orientation = 'Portrait';

        setImageMeta({
          width: img.naturalWidth,
          height: img.naturalHeight,
          type: orientation,
        });
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read photo file. Please try another image.');
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmUpload = () => {
    if (selectedPreview && selectedFile) {
      onFileSelected(selectedPreview, selectedFile.name, selectedFile);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="w-full max-w-[560px] mx-auto min-h-[calc(100vh-80px)] flex flex-col justify-between py-2 px-3">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3">
        <button
          onClick={onCancel}
          className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all shadow-md flex items-center gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400/90 flex items-center gap-1">
          <UploadCloud className="w-4 h-4" />
          Gallery Upload
        </span>

        <button
          onClick={onOpenFreshCamera}
          className="px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all"
        >
          Open Camera
        </button>
      </div>

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Main Drag / Preview Zone */}
      <div className="flex-1 flex flex-col justify-center">
        {errorMessage && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-200">Upload Issue</p>
              <p className="mt-0.5 text-rose-300/90">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {!selectedPreview ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full aspect-[4/5] sm:aspect-[4/4] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 ${
              dragActive
                ? 'border-cyan-400 bg-cyan-500/10 shadow-2xl shadow-cyan-500/20 scale-[0.99]'
                : 'border-slate-700/80 hover:border-cyan-500/50 bg-slate-900/40 hover:bg-slate-900/70'
            }`}
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <ImageIcon className="w-10 h-10 text-cyan-400" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1.5">
              Choose Photo from Device
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mb-5">
              Drag & drop here or tap to select from your gallery. Original quality preserved untouched.
            </p>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] font-semibold text-slate-300">
                JPG
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] font-semibold text-slate-300">
                JPEG
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] font-semibold text-slate-300">
                PNG
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] font-semibold text-slate-300">
                WEBP
              </span>
            </div>

            <p className="mt-4 text-[11px] text-cyan-400/80 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Preserves portrait, landscape, and square aspect ratio
            </p>
          </div>
        ) : (
          /* Preview State */
          <div className="flex flex-col gap-3">
            <div className="relative w-full aspect-[4/5] sm:aspect-[4/4] bg-slate-950 rounded-3xl overflow-hidden border border-cyan-500/30 shadow-2xl flex items-center justify-center">
              <img
                src={selectedPreview}
                alt="Selected"
                className="w-full h-full object-contain"
              />

              {/* Reset preview button */}
              <button
                onClick={() => {
                  setSelectedPreview(null);
                  setSelectedFile(null);
                  setImageMeta(null);
                }}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-900/80 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 transition-all shadow-md"
                title="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Orientation and size tag */}
              {imageMeta && selectedFile && (
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                  <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 text-[11px] font-medium text-cyan-300">
                    {imageMeta.type} • {imageMeta.width}×{imageMeta.height}px
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 text-[11px] font-medium text-slate-300">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate mr-2">
                  <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate text-slate-200 font-medium">
                    {selectedFile.name}
                  </span>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold shrink-0 cursor-pointer"
                >
                  Change
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="pt-4 pb-2">
        {selectedPreview ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedPreview(null);
                setSelectedFile(null);
              }}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm transition-all cursor-pointer"
            >
              Choose Different
            </button>
            <button
              onClick={handleConfirmUpload}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Upload & Share</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
          >
            <UploadCloud className="w-5 h-5 text-slate-950" />
            <span>Select Photo from Gallery</span>
          </button>
        )}
      </div>
    </div>
  );
};
