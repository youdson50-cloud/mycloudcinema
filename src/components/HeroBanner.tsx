import React from 'react';
import { Play, Upload, ShieldCheck, Film, Sparkles } from 'lucide-react';
import { MediaItem, PlaybackProgress } from '../types';

interface HeroBannerProps {
  featuredMedia?: MediaItem;
  lastProgress?: PlaybackProgress;
  onPlay: (media: MediaItem) => void;
  onOpenUpload: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  featuredMedia,
  lastProgress,
  onPlay,
  onOpenUpload,
}) => {
  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/70 border border-slate-800 shadow-2xl mb-8">
      {/* Background Graphic Accents */}
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-purple-500 to-transparent blur-3xl" />

      <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="max-w-xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-[11px] font-semibold text-indigo-400">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Stockage Cloud Privé • AES-256
            </span>
            <span className="text-[11px] text-slate-400">Redondance Multi-Zone</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
            {featuredMedia ? featuredMedia.title : 'MyCloud Cinema'}
          </h1>

          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            {featuredMedia ? (
              <span>
                {featuredMedia.type === 'series'
                  ? `${featuredMedia.seriesTitle} — Saison ${featuredMedia.seasonNumber}, Épisode ${featuredMedia.episodeNumber}`
                  : 'Prêt pour la lecture streaming en haute fidélité sans occuper la mémoire de votre téléphone.'}
              </span>
            ) : (
              'Sauvegardez vos films et séries dans votre espace cloud sécurisé. Libérez la mémoire interne de votre téléphone et regardez vos contenus partout en streaming fluide ou hors ligne.'
            )}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {featuredMedia ? (
              <button
                onClick={() => onPlay(featuredMedia)}
                className="flex items-center gap-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-xs md:text-sm font-semibold text-white shadow-xl shadow-indigo-600/30 transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {lastProgress && lastProgress.position > 10
                    ? `Reprendre (${Math.floor(lastProgress.position / 60)} min)`
                    : 'Lancer la lecture'}
                </span>
              </button>
            ) : null}

            <button
              onClick={onOpenUpload}
              className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-3 text-xs md:text-sm font-semibold text-slate-200 transition cursor-pointer"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Importer une vidéo</span>
            </button>
          </div>
        </div>

        {/* Feature Highlights Badge Container */}
        <div className="hidden lg:grid grid-cols-2 gap-3 w-72">
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Téléphone Libéré</p>
            <p className="text-sm font-bold text-white mt-0.5">0 Go perdu</p>
            <p className="text-[11px] text-slate-400 mt-1">Copie cloud vérifiée avant suppression locale</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Streaming HTTP 206</p>
            <p className="text-sm font-bold text-white mt-0.5">Range Seek</p>
            <p className="text-[11px] text-slate-400 mt-1">Avance rapide sans télécharger tout le fichier</p>
          </div>
        </div>
      </div>
    </div>
  );
};
