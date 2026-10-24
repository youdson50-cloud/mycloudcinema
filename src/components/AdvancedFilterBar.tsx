import React, { useState } from 'react';
import {
  Search,
  X,
  SlidersHorizontal,
  Film,
  Tv,
  Clock,
  History,
  WifiOff,
  Layers,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  Tag,
  Check,
} from 'lucide-react';

export type ContentTypeFilter = 'all' | 'movie' | 'series' | 'episode';
export type QuickFilter = 'all' | 'recently_added' | 'recently_watched' | 'offline_available';
export type SortOption =
  | 'newest'
  | 'oldest'
  | 'alpha_asc'
  | 'alpha_desc'
  | 'last_watched'
  | 'size_desc'
  | 'size_asc';

interface AdvancedFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  contentType: ContentTypeFilter;
  onContentTypeChange: (type: ContentTypeFilter) => void;
  quickFilter: QuickFilter;
  onQuickFilterChange: (filter: QuickFilter) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  selectedSeason: number | 'all';
  onSeasonChange: (season: number | 'all') => void;
  availableSeasons: number[];
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  availableCategories: string[];
  totalResults: number;
  totalItems: number;
  offlineCount: number;
  recentlyWatchedCount: number;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export const AdvancedFilterBar: React.FC<AdvancedFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  contentType,
  onContentTypeChange,
  quickFilter,
  onQuickFilterChange,
  selectedCategory,
  onCategoryChange,
  selectedSeason,
  onSeasonChange,
  availableSeasons,
  sortBy,
  onSortChange,
  availableCategories,
  totalResults,
  totalItems,
  offlineCount,
  recentlyWatchedCount,
  onResetFilters,
  hasActiveFilters,
}) => {
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);

  return (
    <div className="space-y-4 mb-6">
      {/* 1. Main Search & Quick Controls Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input with Clear Button */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher par titre, série, genre (Action, Sci-Fi), saison (S01, S01E02)..."
            className="w-full rounded-2xl bg-slate-900 border border-slate-800 pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Effacer la recherche"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Dropdown & Advanced Toggle */}
        <div className="flex items-center gap-2">
          {/* Sorting */}
          <div className="relative flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="newest" className="bg-slate-900 text-white">Ajouté récemment</option>
              <option value="oldest" className="bg-slate-900 text-white">Plus ancien</option>
              <option value="alpha_asc" className="bg-slate-900 text-white">Titre (A → Z)</option>
              <option value="alpha_desc" className="bg-slate-900 text-white">Titre (Z → A)</option>
              <option value="last_watched" className="bg-slate-900 text-white">Dernièrement visionné</option>
              <option value="size_desc" className="bg-slate-900 text-white">Taille (Décroissante)</option>
              <option value="size_asc" className="bg-slate-900 text-white">Taille (Croissante)</option>
            </select>
          </div>

          {/* Toggle Advanced Filters Button */}
          <button
            onClick={() => setShowAdvancedPanel(!showAdvancedPanel)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-semibold transition cursor-pointer ${
              showAdvancedPanel || hasActiveFilters
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Filtres</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            )}
          </button>

          {/* Reset Filters Shortcut */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 px-2.5 py-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-400 hover:text-red-400 transition cursor-pointer"
              title="Réinitialiser tous les filtres"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden lg:inline">Effacer</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Quick Filters Pills Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar text-xs">
        {/* All */}
        <button
          onClick={() => onQuickFilterChange('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer ${
            quickFilter === 'all' && contentType === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Tout voir</span>
          <span className="text-[10px] opacity-75 font-normal">({totalItems})</span>
        </button>

        {/* Movies */}
        <button
          onClick={() => {
            onContentTypeChange(contentType === 'movie' ? 'all' : 'movie');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer ${
            contentType === 'movie'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Films</span>
        </button>

        {/* Series */}
        <button
          onClick={() => {
            onContentTypeChange(contentType === 'series' ? 'all' : 'series');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer ${
            contentType === 'series'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
          <span>Séries & Épisodes</span>
        </button>

        {/* Recently Added */}
        <button
          onClick={() => onQuickFilterChange(quickFilter === 'recently_added' ? 'all' : 'recently_added')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer ${
            quickFilter === 'recently_added'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Récemment ajoutés</span>
        </button>

        {/* Recently Watched */}
        <button
          onClick={() => onQuickFilterChange(quickFilter === 'recently_watched' ? 'all' : 'recently_watched')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer ${
            quickFilter === 'recently_watched'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
          }`}
        >
          <History className="w-3.5 h-3.5 text-sky-400" />
          <span>Récemment regardés</span>
          {recentlyWatchedCount > 0 && (
            <span className="text-[10px] px-1.5 rounded-full bg-sky-500/20 text-sky-300 font-bold">
              {recentlyWatchedCount}
            </span>
          )}
        </button>

        {/* Offline Availability */}
        <button
          onClick={() => onQuickFilterChange(quickFilter === 'offline_available' ? 'all' : 'offline_available')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer ${
            quickFilter === 'offline_available'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800/80'
          }`}
        >
          <WifiOff className="w-3.5 h-3.5 text-emerald-400" />
          <span>Disponibles hors ligne</span>
          {offlineCount > 0 && (
            <span className="text-[10px] px-1.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
              {offlineCount}
            </span>
          )}
        </button>
      </div>

      {/* 3. Dynamic Season Sub-Filter (Visible when Series filter is active and seasons exist) */}
      {contentType === 'series' && availableSeasons.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5 text-indigo-400" />
            Saisons disponibles :
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => onSeasonChange('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                selectedSeason === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Toutes
            </button>
            {availableSeasons.map((s) => (
              <button
                key={s}
                onClick={() => onSeasonChange(s)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  selectedSeason === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Saison {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Advanced Filter Dropdown Panel (Genre / Category selection) */}
      {showAdvancedPanel && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              Filtrer par Genre / Catégorie
            </span>
            <span className="text-slate-400 text-[11px]">
              {totalResults} résultat(s) sur {totalItems}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => onCategoryChange('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Tous les genres
            </button>
            {availableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Live Search Feedback Badge when filtered */}
      {(hasActiveFilters || searchQuery) && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <div className="flex items-center gap-2">
            <span>
              Résultats : <strong className="text-white">{totalResults}</strong> vidéo(s) trouvée(s)
            </span>
            {searchQuery && (
              <span className="text-[11px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md text-slate-300">
                « {searchQuery} »
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="text-[11px] bg-indigo-950 border border-indigo-500/30 px-2 py-0.5 rounded-md text-indigo-300">
                {selectedCategory}
              </span>
            )}
            {selectedSeason !== 'all' && (
              <span className="text-[11px] bg-indigo-950 border border-indigo-500/30 px-2 py-0.5 rounded-md text-indigo-300">
                Saison {selectedSeason}
              </span>
            )}
          </div>

          <button
            onClick={onResetFilters}
            className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </div>
  );
};
