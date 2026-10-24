import React, { useState } from 'react';
import {
  Film,
  Tv,
  Search,
  Upload,
  HardDrive,
  WifiOff,
  LogOut,
  LogIn,
  Sliders,
  Sparkles,
  Menu,
  X,
  Library,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import { StorageStats } from '../types';

export type NavTab = 'home' | 'movies' | 'series' | 'library' | 'offline' | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenUpload: () => void;
  storageStats: StorageStats | null;
  offlineCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  onOpenUpload,
  storageStats,
  offlineCount,
}) => {
  const { user, signInWithGoogle, signOutUser, isDemoUser, loginAsDemo } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const formatStorage = (bytes?: number) => {
    if (!bytes) return '0 Go';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb < 0.1) {
      const mb = bytes / (1024 * 1024);
      return `${mb.toFixed(0)} Mo`;
    }
    return `${gb.toFixed(1)} Go`;
  };

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'home', label: 'Accueil', icon: Film },
    { id: 'movies', label: 'Films', icon: Film },
    { id: 'series', label: 'Séries', icon: Tv },
    { id: 'library', label: 'Ma Bibliothèque', icon: Library },
    { id: 'offline', label: 'Hors Ligne', icon: WifiOff, badge: offlineCount },
    { id: 'settings', label: 'Stockage & Paramètres', icon: HardDrive },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div
          onClick={() => onTabChange('home')}
          className="flex items-center gap-2.5 cursor-pointer flex-shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Film className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              MyCloud Cinema
            </span>
            <span className="hidden sm:block text-[10px] text-indigo-400 tracking-wider uppercase font-semibold">
              Espace Cloud Personnel
            </span>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`relative px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'text-white bg-slate-800/90 shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500 text-slate-950">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-xs hidden lg:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher films, séries..."
            className="w-full rounded-xl bg-slate-900/90 border border-slate-800 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Right Actions: Storage Meter, Upload, PWA Button, User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Storage Meter Pill */}
          {storageStats && (
            <div
              onClick={() => onTabChange('settings')}
              className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 cursor-pointer hover:border-slate-700 transition"
              title="Espace cloud utilisé"
            >
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              <span>{formatStorage(storageStats.usedBytes)}</span>
              <span className="text-slate-500">/ 100 Go</span>
            </div>
          )}

          {/* Upload Button */}
          {user && (
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Importer</span>
            </button>
          )}

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* User Profile / Auth Toggle */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-indigo-400">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
              </div>
              <button
                onClick={signOutUser}
                className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-900 transition"
                title="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-950 transition cursor-pointer shadow"
              >
                <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                <span>Google</span>
              </button>
              <button
                onClick={loginAsDemo}
                className="hidden sm:block text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                Compte Démo
              </button>
            </div>
          )}

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 pt-3 pb-5 space-y-3">
          {/* Mobile Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher..."
              className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 rounded-full text-[10px] bg-emerald-400 text-black font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {!user && (
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <button onClick={loginAsDemo} className="text-slate-400 underline">
                Accéder en compte démo
              </button>
              <button
                onClick={signInWithGoogle}
                className="px-4 py-2 rounded-xl bg-white text-black font-bold flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                Connexion Google
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
