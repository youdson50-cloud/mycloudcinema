import React, { useEffect, useState } from 'react';
import {
  WifiOff,
  HardDrive,
  Trash2,
  Play,
  Film,
  Tv,
  AlertTriangle,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { OfflineMediaMeta, MediaItem } from '../types';
import {
  getAllOfflineMedia,
  deleteOfflineMedia,
  getStorageQuotaInfo,
} from '../services/indexedDbService';

interface OfflineLibraryViewProps {
  onPlay: (media: MediaItem) => void;
  onRefreshOfflineCount: () => void;
}

export const OfflineLibraryView: React.FC<OfflineLibraryViewProps> = ({
  onPlay,
  onRefreshOfflineCount,
}) => {
  const [offlineItems, setOfflineItems] = useState<OfflineMediaMeta[]>([]);
  const [quotaInfo, setQuotaInfo] = useState<{ usedBytes: number; quotaBytes: number; percentage: number }>({
    usedBytes: 0,
    quotaBytes: 0,
    percentage: 0,
  });
  const [itemToDelete, setItemToDelete] = useState<OfflineMediaMeta | null>(null);

  const loadOfflineData = async () => {
    const items = await getAllOfflineMedia();
    setOfflineItems(items);
    const quota = await getStorageQuotaInfo();
    setQuotaInfo(quota);
    onRefreshOfflineCount();
  };

  useEffect(() => {
    loadOfflineData();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const confirmDeleteLocalCopy = async () => {
    if (!itemToDelete) return;
    try {
      await deleteOfflineMedia(itemToDelete.mediaId);
      setItemToDelete(null);
      await loadOfflineData();
    } catch (err) {
      console.error('Failed to delete offline media:', err);
    }
  };

  const handlePlayOfflineItem = (item: OfflineMediaMeta) => {
    const mediaItem: MediaItem = {
      id: item.mediaId,
      userId: 'local',
      title: item.title,
      type: item.type || 'movie',
      seriesTitle: item.seriesTitle,
      seasonNumber: item.seasonNumber,
      episodeNumber: item.episodeNumber,
      fileId: item.fileName,
      fileName: item.fileName,
      fileSize: item.fileSize,
      mimeType: item.mimeType,
      duration: item.duration,
      status: 'ready',
      createdAt: new Date(item.downloadedAt).toISOString(),
    };
    onPlay(mediaItem);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <WifiOff className="w-4 h-4" />
            <span>Mode Hors Ligne Réel</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white">
            Vidéos téléchargées sur cet appareil
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Ces copies sont stockées dans le navigateur local (IndexedDB) et peuvent être regardées sans aucune connexion Internet.
          </p>
        </div>

        {/* Local Storage Device Usage */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <HardDrive className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <div>
            <p className="text-slate-400">Espace local utilisé :</p>
            <p className="font-bold text-white">
              {formatBytes(quotaInfo.usedBytes)}{' '}
              {quotaInfo.quotaBytes > 0 && (
                <span className="text-slate-400 font-normal">
                  (quota max: {formatBytes(quotaInfo.quotaBytes)})
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Safari iOS & Browser Storage Retention Advice Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
        <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Note de persistance :</strong> Les navigateurs (notamment Safari iOS) peuvent nettoyer les données hors ligne si la mémoire du téléphone est critique. Pour garantir une rétention maximale, installez l'application en mode PWA (« Ajouter à l'écran d'accueil »).
        </p>
      </div>

      {/* Items List */}
      {offlineItems.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
          <WifiOff className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Aucune vidéo téléchargée pour le hors ligne</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Pour regarder un film ou un épisode dans l'avion ou sans connexion 4G, cliquez sur l'icône de téléchargement sur n'importe quelle carte de votre bibliothèque.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {offlineItems.map((item) => (
            <div
              key={item.mediaId}
              className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-lg flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                  <span className="flex items-center gap-1 uppercase tracking-wider font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Téléchargé
                  </span>
                  <span>{new Date(item.downloadedAt).toLocaleDateString()}</span>
                </div>

                <h4 className="text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                {item.type === 'series' && item.seriesTitle && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.seriesTitle} — S{item.seasonNumber || 1}:E{item.episodeNumber || 1}
                  </p>
                )}

                <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
                  <span>{formatBytes(item.fileSize)}</span>
                  <span>•</span>
                  <span>{item.mimeType}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => handlePlayOfflineItem(item)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2 text-xs font-semibold text-white shadow transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Regarder hors ligne</span>
                </button>

                <button
                  onClick={() => setItemToDelete(item)}
                  className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                  title="Supprimer la copie locale pour libérer de la mémoire"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Local Copy Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-left">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">Supprimer la copie locale ?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Vous vous apprêtez à supprimer la copie locale de <strong>« {itemToDelete.title} »</strong> ({formatBytes(itemToDelete.fileSize)}) de la mémoire interne de votre appareil.
            </p>

            <div className="my-3 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-300">
              ✓ <strong>Votre original dans le Cloud reste intact :</strong> Cette action libère l'espace de votre appareil sans toucher à la vidéo conservée dans votre cloud MyCinema.
            </div>

            <div className="mt-5 flex gap-3 justify-end">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteLocalCopy}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-slate-950 shadow"
              >
                Libérer l'espace local
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
