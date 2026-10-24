import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, NavTab } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { MediaCard } from './components/MediaCard';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { UploadModal } from './components/UploadModal';
import { OfflineLibraryView } from './components/OfflineLibraryView';
import { SettingsAndMonitoring } from './components/SettingsAndMonitoring';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  AdvancedFilterBar,
  ContentTypeFilter,
  QuickFilter,
  SortOption,
} from './components/AdvancedFilterBar';
import { MediaItem, PlaybackProgress, StorageStats } from './types';
import {
  subscribeUserMedia,
  deleteMediaItem,
  getUserAllProgress,
} from './services/firestoreService';
import { getAllOfflineMedia } from './services/indexedDbService';
import {
  Film,
  Tv,
  Library,
  Upload,
  Sparkles,
  Clock,
  Layers,
  RotateCcw,
  Search,
} from 'lucide-react';

function MainApp() {
  const { user, isDemoUser, loginAsDemo } = useAuth();

  const [currentTab, setCurrentTab] = useState<NavTab>('home');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [contentType, setContentType] = useState<ContentTypeFilter>('all');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeason, setSelectedSeason] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Media and progress states
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, PlaybackProgress>>({});
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [offlineMediaIds, setOfflineMediaIds] = useState<Set<string>>(new Set());
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);

  // Modals
  const [activePlayingMedia, setActivePlayingMedia] = useState<MediaItem | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MediaItem | null>(null);

  const effectiveUserId = user ? user.uid : 'guest_preview';

  // 1. Subscribe to media updates (Cloud Firestore if signed in, or local store if guest)
  useEffect(() => {
    const unsubscribe = subscribeUserMedia(
      effectiveUserId,
      (items) => {
        const seen = new Set<string>();
        const uniqueItems = items.filter((item) => {
          if (!item.id || seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
        setMediaList(uniqueItems);
      },
      (err) => {
        console.warn('Subscription info:', err);
      }
    );

    return () => unsubscribe();
  }, [effectiveUserId]);

  // 2. Fetch progress & offline count
  const refreshAuxiliaryData = async () => {
    try {
      const progress = await getUserAllProgress(effectiveUserId);
      setProgressMap(progress);

      const statsRes = await fetch(`/api/storage/stats/${effectiveUserId}`);
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setStorageStats(stats);
      }
    } catch {
      // ignore
    }

    try {
      const offline = await getAllOfflineMedia();
      setOfflineCount(offline.length);
      setOfflineMediaIds(new Set(offline.map((m) => m.mediaId)));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshAuxiliaryData();
  }, [user, mediaList.length]);

  // Handle delete from Cloud
  const handleDeleteMedia = async () => {
    if (!itemToDelete || !user) return;
    try {
      // Delete from Cloud Storage
      await fetch(`/api/storage/${user.uid}/${itemToDelete.fileId}`, {
        method: 'DELETE',
      });
      // Delete from Firestore
      await deleteMediaItem(itemToDelete.id);
      setItemToDelete(null);
      refreshAuxiliaryData();
    } catch (err) {
      console.error('Failed to delete media:', err);
    }
  };

  // Derive Available Categories & Seasons
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    mediaList.forEach((m) => {
      if (m.category && m.category.trim()) cats.add(m.category.trim());
    });
    ['Action', 'Sci-Fi', 'Drame', 'Comédie', 'Animation', 'Documentaire'].forEach((c) => cats.add(c));
    return Array.from(cats);
  }, [mediaList]);

  const availableSeasons = useMemo(() => {
    const seasons = new Set<number>();
    mediaList.forEach((m) => {
      if (m.type === 'series' && m.seasonNumber !== undefined) {
        seasons.add(m.seasonNumber);
      }
    });
    return Array.from(seasons).sort((a, b) => a - b);
  }, [mediaList]);

  const recentlyWatchedCount = useMemo(() => {
    return mediaList.filter((item) => {
      const prog = progressMap[item.id];
      return prog && (prog.position > 0 || !!prog.lastPlayedAt);
    }).length;
  }, [mediaList, progressMap]);

  // Check if any filter is active
  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    contentType !== 'all' ||
    quickFilter !== 'all' ||
    selectedCategory !== 'all' ||
    selectedSeason !== 'all' ||
    sortBy !== 'newest';

  const handleResetFilters = () => {
    setSearchQuery('');
    setContentType('all');
    setQuickFilter('all');
    setSelectedCategory('all');
    setSelectedSeason('all');
    setSortBy('newest');
  };

  // 3. Advanced Filtering Logic
  const filteredMedia = useMemo(() => {
    return mediaList.filter((item) => {
      // Content Type / Navigation Tab
      const effectiveType =
        currentTab === 'movies' ? 'movie' : currentTab === 'series' ? 'series' : contentType;

      if (effectiveType === 'movie' && item.type !== 'movie') return false;
      if (effectiveType === 'series' && item.type !== 'series') return false;
      if (effectiveType === 'episode' && (item.type !== 'series' || item.episodeNumber === undefined))
        return false;

      // Season filter (for series)
      if (selectedSeason !== 'all' && item.seasonNumber !== selectedSeason) {
        return false;
      }

      // Category / Genre filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Quick Filters
      if (quickFilter === 'recently_added') {
        const addedTime = new Date(item.createdAt).getTime();
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        if (addedTime < thirtyDaysAgo) return false;
      } else if (quickFilter === 'recently_watched') {
        const prog = progressMap[item.id];
        if (!prog || (prog.position === 0 && !prog.lastPlayedAt)) return false;
      } else if (quickFilter === 'offline_available') {
        if (!offlineMediaIds.has(item.id)) return false;
      }

      // Search Query Matching across titles, series names, categories, file names, seasons/episodes, subtitles
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = item.title.toLowerCase().includes(q);
        const seriesMatch = item.seriesTitle ? item.seriesTitle.toLowerCase().includes(q) : false;
        const categoryMatch = item.category ? item.category.toLowerCase().includes(q) : false;
        const fileNameMatch = item.fileName ? item.fileName.toLowerCase().includes(q) : false;
        const mimeMatch = item.mimeType ? item.mimeType.toLowerCase().includes(q) : false;

        // Season / Episode tokens matching (e.g., S01, S01E02, Saison 1, Episode 2)
        let seasonEpMatch = false;
        if (item.type === 'series') {
          const sNum = item.seasonNumber;
          const eNum = item.episodeNumber;
          if (sNum !== undefined) {
            const sTags = [`s${sNum}`, `s0${sNum}`, `saison ${sNum}`, `season ${sNum}`];
            if (sTags.some((tag) => q.includes(tag) || tag.includes(q))) seasonEpMatch = true;
          }
          if (eNum !== undefined) {
            const eTags = [`e${eNum}`, `e0${eNum}`, `ep ${eNum}`, `episode ${eNum}`, `épisode ${eNum}`];
            if (eTags.some((tag) => q.includes(tag) || tag.includes(q))) seasonEpMatch = true;
          }
          if (sNum !== undefined && eNum !== undefined) {
            const fullTag = `s${sNum < 10 ? '0' + sNum : sNum}e${eNum < 10 ? '0' + eNum : eNum}`.toLowerCase();
            if (fullTag.includes(q) || q.includes(fullTag)) seasonEpMatch = true;
          }
        }

        // Subtitles format / language query
        const subMatch = item.subtitles
          ? item.subtitles.some(
              (sub) => sub.label.toLowerCase().includes(q) || sub.lang.toLowerCase().includes(q)
            )
          : false;

        if (
          !titleMatch &&
          !seriesMatch &&
          !categoryMatch &&
          !fileNameMatch &&
          !mimeMatch &&
          !seasonEpMatch &&
          !subMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    mediaList,
    currentTab,
    contentType,
    selectedSeason,
    selectedCategory,
    quickFilter,
    progressMap,
    offlineMediaIds,
    searchQuery,
  ]);

  // 4. Sorting Logic
  const sortedFilteredMedia = useMemo(() => {
    const list = [...filteredMedia];
    list.sort((a, b) => {
      if (sortBy === 'alpha_asc') {
        return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
      }
      if (sortBy === 'alpha_desc') {
        return b.title.localeCompare(a.title, 'fr', { sensitivity: 'base' });
      }
      if (sortBy === 'size_desc') {
        return b.fileSize - a.fileSize;
      }
      if (sortBy === 'size_asc') {
        return a.fileSize - b.fileSize;
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'last_watched') {
        const timeA = progressMap[a.id]?.lastPlayedAt
          ? new Date(progressMap[a.id].lastPlayedAt).getTime()
          : 0;
        const timeB = progressMap[b.id]?.lastPlayedAt
          ? new Date(progressMap[b.id].lastPlayedAt).getTime()
          : 0;
        return timeB - timeA;
      }
      // Default: newest first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [filteredMedia, sortBy, progressMap]);

  // In-progress items for "Continuer à regarder"
  const inProgressList = useMemo(() => {
    return mediaList.filter((item) => {
      const prog = progressMap[item.id];
      return prog && prog.position > 15 && !prog.completed;
    });
  }, [mediaList, progressMap]);

  const featured = inProgressList[0] || mediaList[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          if (tab === 'movies') setContentType('movie');
          else if (tab === 'series') setContentType('series');
          else if (tab === 'library') setContentType('all');
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenUpload={() => setIsUploadOpen(true)}
        storageStats={storageStats}
        offlineCount={offlineCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Offline Library View */}
        {currentTab === 'offline' ? (
          <OfflineLibraryView
            onPlay={(media) => setActivePlayingMedia(media)}
            onRefreshOfflineCount={refreshAuxiliaryData}
          />
        ) : currentTab === 'settings' ? (
          /* Settings, Cost & Architecture Supervision */
          <SettingsAndMonitoring
            userId={effectiveUserId}
            storageStats={storageStats}
            mediaList={mediaList}
            onRefreshStats={refreshAuxiliaryData}
            onMediaAdded={(media) => setMediaList((prev) => [media, ...prev])}
          />
        ) : (
          /* Home, Movies, Series, Library */
          <div>
            {/* Hero banner on Home tab when no search query and no restrictive filters */}
            {currentTab === 'home' && !hasActiveFilters && (
              <HeroBanner
                featuredMedia={featured}
                lastProgress={featured ? progressMap[featured.id] : undefined}
                onPlay={(media) => setActivePlayingMedia(media)}
                onOpenUpload={() => setIsUploadOpen(true)}
              />
            )}

            {/* Advanced Search & Filtering Bar */}
            <AdvancedFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              contentType={contentType}
              onContentTypeChange={setContentType}
              quickFilter={quickFilter}
              onQuickFilterChange={setQuickFilter}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedSeason={selectedSeason}
              onSeasonChange={setSelectedSeason}
              availableSeasons={availableSeasons}
              sortBy={sortBy}
              onSortChange={setSortBy}
              availableCategories={availableCategories}
              totalResults={sortedFilteredMedia.length}
              totalItems={mediaList.length}
              offlineCount={offlineCount}
              recentlyWatchedCount={recentlyWatchedCount}
              onResetFilters={handleResetFilters}
              hasActiveFilters={hasActiveFilters}
            />

            {/* Section 1: Continuer à regarder (Visible on Home when not searching) */}
            {currentTab === 'home' && !searchQuery && inProgressList.length > 0 && quickFilter === 'all' && (
              <section className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-base font-bold text-white tracking-wide">
                    Continuer à regarder
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {inProgressList.map((item) => (
                    <MediaCard
                      key={`prog-${item.id}`}
                      media={item}
                      userId={effectiveUserId}
                      progress={progressMap[item.id]}
                      onPlay={(m) => setActivePlayingMedia(m)}
                      onDelete={(m) => setItemToDelete(m)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Section 2: Filtered Catalog Grid */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {currentTab === 'movies' || contentType === 'movie' ? (
                    <Film className="w-4 h-4 text-purple-400" />
                  ) : currentTab === 'series' || contentType === 'series' ? (
                    <Tv className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Layers className="w-4 h-4 text-indigo-400" />
                  )}
                  <h2 className="text-base font-bold text-white tracking-wide">
                    {currentTab === 'movies' || contentType === 'movie'
                      ? 'Films'
                      : currentTab === 'series' || contentType === 'series'
                      ? 'Séries & Épisodes'
                      : currentTab === 'library'
                      ? 'Ma Bibliothèque'
                      : 'Catalogue'}
                  </h2>
                </div>

                <div className="text-xs text-slate-400">
                  {sortedFilteredMedia.length} sur {mediaList.length} vidéo(s)
                </div>
              </div>

              {sortedFilteredMedia.length === 0 ? (
                /* Empty state */
                <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-800 bg-slate-900/40">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                    {hasActiveFilters ? (
                      <Search className="w-7 h-7" />
                    ) : (
                      <Film className="w-7 h-7" />
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white">
                    {hasActiveFilters
                      ? 'Aucun contenu ne correspond à vos filtres'
                      : 'Votre espace cloud est vide'}
                  </h3>

                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-5">
                    {hasActiveFilters
                      ? 'Essayez de modifier votre recherche ou de réinitialiser les filtres pour afficher l\'ensemble de vos vidéos.'
                      : 'Importez des films ou séries depuis votre téléphone ou ordinateur pour les sécuriser dans votre cloud et libérer votre stockage interne.'}
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {hasActiveFilters ? (
                      <button
                        onClick={handleResetFilters}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Réinitialiser les filtres</span>
                      </button>
                    ) : user ? (
                      <button
                        onClick={() => setIsUploadOpen(true)}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Importer mon premier fichier</span>
                      </button>
                    ) : (
                      <button
                        onClick={loginAsDemo}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Explorer en mode démo</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {sortedFilteredMedia.map((item) => (
                    <MediaCard
                      key={`cat-${item.id}`}
                      media={item}
                      userId={effectiveUserId}
                      progress={progressMap[item.id]}
                      onPlay={(m) => setActivePlayingMedia(m)}
                      onDelete={(m) => setItemToDelete(m)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Floating Offline Network Indicator */}
      <OfflineIndicator />

      {/* Fullscreen Video Player Modal */}
      {activePlayingMedia && (
        <VideoPlayerModal
          media={activePlayingMedia}
          userId={effectiveUserId}
          allMedia={mediaList}
          onClose={() => {
            setActivePlayingMedia(null);
            refreshAuxiliaryData();
          }}
          onNextEpisode={(next) => setActivePlayingMedia(next)}
        />
      )}

      {/* Upload Video Modal */}
      {isUploadOpen && (
        <UploadModal
          userId={effectiveUserId}
          onClose={() => setIsUploadOpen(false)}
          onUploadSuccess={(newItem) => {
            setMediaList((prev) => {
              if (prev.some((m) => m.id === newItem.id)) return prev;
              return [newItem, ...prev];
            });
            refreshAuxiliaryData();
          }}
        />
      )}

      {/* Cloud File Deletion Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-left">
            <h3 className="text-base font-bold text-white mb-2">Supprimer définitivement du Cloud ?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer <strong>« {itemToDelete.title} »</strong> de votre stockage cloud distant ? Cette action est irréversible.
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteMedia}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow"
              >
                Supprimer du Cloud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-400">
        <p className="text-slate-300 font-medium">MyCloud Cinema • Stockage Vidéo Personnel Sécurisé</p>
        <p className="text-[11px] text-slate-400 mt-1">
          Chiffrement AES-256 • Streaming HTTP 206 partiel • Mode Hors Ligne PWA • Haute disponibilité Multi-Zone
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
