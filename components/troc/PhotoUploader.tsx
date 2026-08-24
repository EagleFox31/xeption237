import React, { useRef } from 'react';
import { Upload, ImagePlus, Loader2, X, AlertTriangle } from 'lucide-react';

const MAX_PHOTOS = 8;

interface PhotoUploaderProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  onNext?: () => void;
  isUploading?: boolean;
  isCheckingPhotos?: boolean;
  issueIndices?: number[];
  visionReady?: boolean;
  visionLoading?: boolean;
  visionSetupHint?: string | null;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos, onPhotosChange, onNext, isUploading = false, isCheckingPhotos = false, issueIndices = [],
  visionReady = true, visionLoading = false, visionSetupHint = null,
}) => {
  const issueSet = new Set(issueIndices);
  const hasIssues = issueSet.size > 0;
  const isBusy = isUploading || isCheckingPhotos;
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newPhotos = [...photos, ...Array.from(files)].slice(0, MAX_PHOTOS);
    onPhotosChange(newPhotos);
  };

  const removePhoto = (index: number) =>
    onPhotosChange(photos.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-5 p-6 lg:p-8">
      <div className="w-full text-left border-b border-white/20 pb-4">
        <h2 className="text-xl font-tech font-bold uppercase text-white tracking-wider">Photos</h2>
        <p className="text-xs text-white/80 mt-1 font-sans leading-relaxed">
          {photos.length}/{MAX_PHOTOS} fichiers — ajoute des photos nettes de ton appareil sous tous les angles.
        </p>
      </div>

      {visionLoading && (
        <p className="text-xs text-white/70 font-sans">Préparation du contrôle photo…</p>
      )}

      {!visionLoading && !visionReady && visionSetupHint && (
        <div className="flex items-start gap-2 bg-red-950/50 border border-red-700/60 rounded-sm p-3">
          <AlertTriangle className="w-4 h-4 text-red-300 mt-0.5 shrink-0" />
          <div className="text-red-100 text-xs font-sans leading-relaxed space-y-2">
            <p className="font-medium text-white">Contrôle photo IA non configuré</p>
            <p>{visionSetupHint}</p>
          </div>
        </div>
      )}

      {hasIssues && (
        <div className="flex items-start gap-2 bg-amber-950/40 border border-amber-700/50 rounded-sm p-3">
          <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
          <p className="text-amber-200 text-xs font-sans leading-relaxed">
            {issueSet.size === 1
              ? `La photo ${[...issueSet][0]} ne montre pas clairement votre téléphone. Remplacez-la par une photo nette de l'appareil pour relancer l'estimation.`
              : `${issueSet.size} photos ne montrent pas clairement votre téléphone. Remplacez celles signalées en rouge pour relancer l'estimation.`}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:items-start">
        {/* Drop zone — colonne gauche sur laptop */}
        <div className="flex flex-col gap-4">
          <p className="hidden lg:block text-[10px] font-tech uppercase tracking-widest text-white/70 text-left">
            Importer
          </p>
          <div
            className="border border-dashed border-white/20 hover:border-xeption-gold/50 bg-[#1c1c16]/90 transition-all cursor-pointer p-8 lg:p-6 flex flex-col items-center justify-center gap-3 rounded-sm lg:min-h-[220px]"
            onClick={() => inputRef.current?.click()}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            onDragOver={e => e.preventDefault()}
          >
            <div className="w-12 h-12 border border-white/20 flex items-center justify-center">
              <Upload className="w-5 h-5 text-white/60" />
            </div>
            <p className="text-sm text-white/70 font-sans text-center">
              Déposez vos images ici ou <span className="text-xeption-gold">cliquez pour sélectionner</span>
            </p>
            <p className="text-[10px] text-white/50 font-tech uppercase tracking-widest">
              JPG · PNG · WEBP
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />

          {(isUploading || isCheckingPhotos) && (
            <div role="status" className="flex items-center gap-3 text-xeption-gold text-sm font-tech">
              <Loader2 className="animate-spin w-4 h-4" />
              <span>{isCheckingPhotos ? 'Contrôle IA : smartphone réel, photos authentiques…' : 'Envoi en cours…'}</span>
            </div>
          )}
        </div>

        {/* Previews — colonne droite sur laptop */}
        <div className="flex flex-col gap-4">
          <p className="hidden lg:block text-[10px] font-tech uppercase tracking-widest text-white/70 text-left">
            Aperçu ({photos.length}/{MAX_PHOTOS})
          </p>
          {photos.length > 0 ? (
            <div className="grid grid-cols-4 lg:grid-cols-3 gap-2">
              {photos.map((file, i) => {
                const isFlagged = issueSet.has(i + 1); // index 1-based côté Gemini
                return (
                  <div
                    key={i}
                    className={`relative aspect-square bg-black/60 overflow-hidden group ${
                      isFlagged
                        ? 'border-2 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                        : 'border border-white/20'
                    }`}
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className={`w-full h-full object-cover transition-opacity ${
                        isFlagged ? 'opacity-60' : 'opacity-80 group-hover:opacity-100'
                      }`}
                    />
                    {isFlagged && (
                      <div className="absolute inset-0 flex items-end justify-center pb-1">
                        <span className="bg-red-600 text-white text-[9px] font-tech font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm">
                          À remplacer
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => removePhoto(i)}
                      className={`absolute top-1 right-1 w-5 h-5 bg-black/80 border border-white/20 flex items-center justify-center transition-opacity ${
                        isFlagged ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                );
              })}
              {Array.from({ length: MAX_PHOTOS - photos.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  onClick={() => inputRef.current?.click()}
                  className="aspect-square border border-dashed border-white/20 hover:border-white/20 flex items-center justify-center cursor-pointer transition-all"
                >
                  <ImagePlus className="w-4 h-4 text-white/40" />
                </div>
              ))}
            </div>
          ) : (
            <div className="hidden lg:flex flex-col items-center justify-center min-h-[220px] border border-dashed border-white/20 rounded-sm text-center px-4">
              <ImagePlus className="w-8 h-8 text-white/40 mb-2" />
              <p className="text-xs text-white/60 font-sans">Vos photos apparaîtront ici</p>
            </div>
          )}
        </div>
      </div>

      {onNext && (
        <button
          onClick={onNext}
          disabled={photos.length === 0 || isBusy || !visionReady || visionLoading}
          className="w-full bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest py-4 text-sm shadow-[0_0_20px_rgba(255,215,0,0.25)] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isCheckingPhotos ? 'Contrôle IA en cours…' : isUploading ? 'Envoi…' : 'Continuer'}
        </button>
      )}
    </div>
  );
};
