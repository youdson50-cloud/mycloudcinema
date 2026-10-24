import React, { useState, useEffect } from 'react';
import {
  Play,
  Film,
  Tv,
  Download,
  Check,
  Trash2,
  Cloud,
  HardDrive,
  WifiOff,
  Clock,
  MoreVertical,
} from 'lucide-react';
import { MediaItem, PlaybackProgress } from '../types';
import {
  isMediaDownloaded,
  saveOfflineMedia,
  deleteOfflineMedia,
} from '../services/indexedDbService';

interface MediaCardProps {
  media: MediaItem;
  userId: string;
  progress?: PlaybackProgress;
  onPlay: (media: MediaItem) => void;
  onDelete: (media: MediaItem) => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  media,
  userId,
  progress,
  onPlay,
  onDelete,
}) => {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    isMediaDownloaded(media.id).then(setIsDownloaded);
  }, [media.id]);

  const formatDuration = (secs?: number) => {
    if (!secs) return null;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s}s`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(1)} Go`;
    }
    return `${mb.toFixed(0)} Mo`;
  };

  // Real offline download execution using fetch stream to Blob -> IndexedDB
  const handleDownloadOffline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading || isDownloaded) return;

    setIsDownloading(true);
    setDownloadProgress(5);

    try {
      const streamUrl = `/api/storage/stream/${userId}/${media.fileId}`;
      const response = await fetch(streamUrl);
      if (!response.ok) throw new Error('Download stream error');

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : media.fileSize;

      const reader = response.body?.getReader();
      if (!reader) {
        const blob = await response.blob();
        await saveOfflineMedia(
          {
            mediaId: media.id,
            title: media.title,
            fileName: media.fileName,
            fileSize: blob.size,
            mimeType: media.mimeType,
            downloadedAt: Date.now(),
            duration: media.duration,
            type: media.type,
            seriesTitle: media.seriesTitle,
            seasonNumber: media.seasonNumber,
            episodeNumber: media.episodeNumber,
          },
          blob
        );
        setIsDownloaded(true);
        setIsDownloading(false);
        return;
      }

      const chunks: BlobPart[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value.buffer as ArrayBuffer);
          receivedBytes += value.length;
        }
        if (totalBytes > 0) {
          const percent = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
          setDownloadProgress(percent);
        }
      }

      const fullBlob = new Blob(chunks, { type: media.mimeType || 'video/mp4' });
      await saveOfflineMedia(
        {
          mediaId: media.id,
          title: media.title,
          fileName: media.fileName,
          fileSize: fullBlob.size,
          mimeType: media.mimeType,
          downloadedAt: Date.now(),
          duration: media.duration,
          type: media.type,
          seriesTitle: media.seriesTitle,
          seasonNumber: media.seasonNumber,
          episodeNumber: media.episodeNumber,
        },
        fullBlob
      );

      setIsDownloaded(true);
      setDownloadProgress(100);
    } catch (err) {
      console.error('Offline download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRemoveOfflineCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteOfflineMedia(media.id);
      setIsDownloaded(false);
    } catch (err) {
      console.error('Failed to delete offline copy:', err);
    }
  };

  // Progress percentage calculation
  const progressPercent =
    progress && progress.duration > 0
      ? Math.min(100, Math.round((progress.position / progress.duration) * 100))
      : 0;

  return (
    <div
      onClick={() => onPlay(media)}
      className="group relative rounded-2xl bg-slate-900/80 border border-slate-800/80 overflow-hidden shadow-lg hover:shadow-indigo-500/10 hover:border-slate-700 transition duration-300 flex flex-col cursor-pointer"
    >
      {/* Thumbnail Aspect Ratio Container */}
      <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
        {media.thumbnailUrl ? (
          <img
            src={media.thumbnailUrl}
            alt={media.title}
            className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/40 p-4 text-center">
            {media.type === 'series' ? (
              <Tv className="w-10 h-10 text-indigo-400/60 mb-1 group-hover:scale-110 transition" />
            ) : (
              <Film className="w-10 h-10 text-purple-400/60 mb-1 group-hover:scale-110 transition" />
            )}
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest line-clamp-1">
              {media.category || (media.type === 'series' ? 'Série' : 'Cinéma')}
            </span>
          </div>
        )}

        {/* Hover Dark Overlay & Big Play Button */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-600/50 transform scale-75 group-hover:scale-100 transition duration-300">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Badges on Top */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between text-[10px] font-semibold">
          <span className="flex items-center gap-1 rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 text-slate-200 border border-white/10">
            {media.type === 'series' ? (
              <>
                <Tv className="w-3 h-3 text-indigo-400" /> S{media.seasonNumber || 1}:E{media.episodeNumber || 1}
              </>
            ) : (
              <>
                <Film className="w-3 h-3 text-purple-400" /> FILM
              </>
            )}
          </span>

          <div className="flex items-center gap-1">
            {isDownloaded ? (
              <span className="flex items-center gap-1 rounded-md bg-emerald-500/90 text-slate-950 px-2 py-0.5 font-bold shadow-sm">
                <WifiOff className="w-3 h-3" /> Hors ligne
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-md bg-slate-900/80 backdrop-blur-md text-slate-300 px-1.5 py-0.5 border border-white/10">
                <Cloud className="w-3 h-3 text-indigo-400" /> Cloud
              </span>
            )}
          </div>
        </div>

        {/* Watch Progress bar */}
        {progressPercent > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-800">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-3.5 flex flex-col justify-between flex-1">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-xs md:text-sm font-bold text-white line-clamp-1 group-hover:text-indigo-400 transition">
              {media.title}
            </h3>

            {/* Context action menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {showMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1 z-30 text-xs"
                >
                  {isDownloaded ? (
                    <button
                      onClick={(e) => {
                        handleRemoveOfflineCopy(e);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg text-amber-400 hover:bg-slate-800 transition"
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>Supprimer copie locale</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        handleDownloadOffline(e);
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg text-slate-200 hover:bg-slate-800 transition"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Télécharger hors ligne</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete(media);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg text-red-400 hover:bg-red-950/40 transition border-t border-slate-800 mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer du Cloud</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {media.type === 'series' && media.seriesTitle && (
            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
              {media.seriesTitle}
            </p>
          )}
        </div>

        {/* Footer Meta & Quick Download */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>{formatFileSize(media.fileSize)}</span>
            {media.subtitles && media.subtitles.length > 0 && (
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1 rounded">
                ST
              </span>
            )}
          </div>

          {/* Download offline button or indicator */}
          <div>
            {isDownloading ? (
              <span className="text-indigo-400 text-[10px] font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                {downloadProgress}%
              </span>
            ) : isDownloaded ? (
              <span className="text-emerald-400 text-[10px] font-medium flex items-center gap-1" title="Disponible hors ligne">
                <Check className="w-3 h-3" /> Téléchargé
              </span>
            ) : (
              <button
                onClick={handleDownloadOffline}
                className="text-slate-400 hover:text-indigo-400 p-1 rounded-md transition"
                title="Télécharger pour regarder hors ligne"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
