import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Server,
  Activity,
  HardDrive,
  Cpu,
  Layers,
  Database,
  Lock,
  RefreshCw,
  Terminal,
  Sparkles,
  ExternalLink,
  DollarSign,
  Cloud,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  Film,
  Tv,
  Trash2,
  Info,
  TrendingUp,
  Sliders,
  ChevronRight,
  Calculator,
} from 'lucide-react';
import { StorageStats, MediaItem, OfflineMediaMeta } from '../types';
import { saveMediaItem } from '../services/firestoreService';
import {
  getAllOfflineMedia,
  getStorageQuotaInfo,
  deleteOfflineMedia,
  clearAllOfflineMedia,
} from '../services/indexedDbService';

interface SettingsAndMonitoringProps {
  userId: string;
  storageStats: StorageStats | null;
  mediaList?: MediaItem[];
  onRefreshStats: () => void;
  onMediaAdded: (media: MediaItem) => void;
}

export const SettingsAndMonitoring: React.FC<SettingsAndMonitoringProps> = ({
  userId,
  storageStats,
  mediaList = [],
  onRefreshStats,
  onMediaAdded,
}) => {
  const [activeTab, setActiveTab] = useState<'storage' | 'architecture' | 'metrics'>('storage');
  const [prometheusRaw, setPrometheusRaw] = useState<string>('');
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [isAddingSample, setIsAddingSample] = useState(false);
  const [sampleSuccessMessage, setSampleSuccessMessage] = useState<string | null>(null);

  // Offline storage state
  const [offlineItems, setOfflineItems] = useState<OfflineMediaMeta[]>([]);
  const [offlineUsedBytes, setOfflineUsedBytes] = useState<number>(0);
  const [deviceQuota, setDeviceQuota] = useState<{ usedBytes: number; quotaBytes: number; percentage: number }>({
    usedBytes: 0,
    quotaBytes: 0,
    percentage: 0,
  });
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

  // Interactive Cost Simulator State
  const [simulatedGb, setSimulatedGb] = useState<number>(25);

  const fetchMonitoringData = async () => {
    setLoadingMetrics(true);
    try {
      const [metricsRes, statusRes] = await Promise.all([
        fetch('/metrics').then((r) => r.text()),
        fetch('/api/system/status').then((r) => r.json()),
      ]);
      setPrometheusRaw(metricsRes);
      setSystemStatus(statusRes);
    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const loadOfflineStats = async () => {
    try {
      const items = await getAllOfflineMedia();
      setOfflineItems(items);
      const totalBytes = items.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);
      setOfflineUsedBytes(totalBytes);
      const quota = await getStorageQuotaInfo();
      setDeviceQuota(quota);
    } catch (err) {
      console.error('Failed to load offline stats:', err);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    loadOfflineStats();
  }, []);

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Cloud storage metrics
  // Compute accurately from mediaList or storageStats
  const computedMediaBytes = mediaList.reduce((acc, item) => acc + (item.fileSize || 0), 0);
  const effectiveCloudBytes = Math.max(storageStats?.usedBytes || 0, computedMediaBytes);
  const effectiveVideoCount = Math.max(storageStats?.videoCount || 0, mediaList.length);

  const moviesCount = mediaList.filter((m) => m.type === 'movie').length;
  const seriesCount = mediaList.filter((m) => m.type === 'series').length;

  // Google Cloud Storage Pricing Constants
  // Always Free Tier: 5 GB-months of Standard Storage in US regions
  const GCS_FREE_TIER_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
  const GCS_PRICE_PER_GB_MONTH = 0.020; // $0.020 per GB
  const GCS_EGRESS_FREE_TIER_GB = 100; // 100 GB/month egress free
  const GCS_EGRESS_PRICE_PER_GB = 0.12; // $0.12/GB after 100 GB

  const usedGb = effectiveCloudBytes / (1024 * 1024 * 1024);
  const freeTierGb = 5.0;
  const billableGb = Math.max(0, usedGb - freeTierGb);
  const estimatedMonthlyStorageCost = billableGb * GCS_PRICE_PER_GB_MONTH;

  // Percentage of Always Free Tier (0 to 100% and beyond)
  const percentOfFreeTier = Math.min(100, Math.round((effectiveCloudBytes / GCS_FREE_TIER_BYTES) * 100));

  // Determine Alert Level
  const isExceeded = usedGb > freeTierGb;
  const isNearLimit = !isExceeded && usedGb >= 4.0; // >= 80% of free tier
  const isComfortable = !isExceeded && !isNearLimit;

  // Cost simulator calculations
  const simBillableGb = Math.max(0, simulatedGb - freeTierGb);
  const simGcsCost = simBillableGb * GCS_PRICE_PER_GB_MONTH;
  const simWasabiCost = simulatedGb * 0.0059;
  const simBackblazeCost = simulatedGb * 0.0060;

  // Purge offline downloads
  const handlePurgeOffline = async () => {
    try {
      await clearAllOfflineMedia();
      setShowPurgeConfirm(false);
      await loadOfflineStats();
      onRefreshStats();
    } catch (err) {
      console.error('Failed to clear offline media:', err);
    }
  };

  // Add open-source Creative Commons test video
  const handleAddSampleVideo = async () => {
    setIsAddingSample(true);
    setSampleSuccessMessage(null);
    try {
      const sampleItem: MediaItem = {
        id: `sample_big_buck_bunny_${Date.now()}`,
        userId,
        title: 'Big Buck Bunny (Trailer 4K HDR)',
        type: 'movie',
        category: 'Animation',
        fileId: 'sample-video-bbb',
        fileName: 'big_buck_bunny_trailer.mp4',
        fileSize: 42 * 1024 * 1024, // 42 Mo
        mimeType: 'video/mp4',
        duration: 596,
        thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=640&q=80',
        status: 'ready',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subtitles: [
          {
            id: 'sub_fr_sample',
            label: 'Français (Complet)',
            lang: 'fr',
            format: 'vtt',
            content: `WEBVTT\n\n00:00:01.000 --> 00:00:04.000\n[Forêt paisible au printemps]\n\n00:00:05.000 --> 00:00:09.000\nBienvenue dans MyCloud Cinema — Lecture en streaming chiffré.\n\n00:00:10.000 --> 00:00:15.000\nFlux vidéo fluide avec requêtes HTTP 206 partagées.`,
          },
        ],
      };

      await saveMediaItem(sampleItem);
      onMediaAdded(sampleItem);
      setSampleSuccessMessage('Vidéo de démonstration ajoutée avec sous-titres !');
      onRefreshStats();
      loadOfflineStats();
    } catch (err: any) {
      console.error('Failed to add sample:', err);
    } finally {
      setIsAddingSample(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Header with Tab Switcher */}
      <div className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <HardDrive className="w-4 h-4" />
              <span>Gestion du Stockage & Paramètres</span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white">
              Stockage Cloud, Espace Local & Coûts GCP
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Supervision de votre quota Google Cloud Storage, espace hors ligne de votre appareil et alertes financières proactives.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onRefreshStats();
                loadOfflineStats();
                fetchMonitoringData();
              }}
              disabled={loadingMetrics}
              className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-medium text-slate-300 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingMetrics ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'storage'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Gestion Stockage & Coûts GCP</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'architecture'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Architecture & Sécurité AES-256</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'metrics'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Métriques Prometheus (/metrics)</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: STORAGE MANAGEMENT & GCS COST BREAKDOWN */}
      {/* ========================================================= */}
      {activeTab === 'storage' && (
        <div className="space-y-6">
          {/* Proactive Free Tier Alert Banner */}
          {isExceeded ? (
            <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex items-start gap-3.5 shadow-lg">
              <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5 animate-bounce" />
              <div>
                <h4 className="text-sm font-bold text-white">
                  Palier gratuit Google Cloud dépassé ({usedGb.toFixed(2)} Go utilisés)
                </h4>
                <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                  Vous avez dépassé la limite de 5,0 Go offerte par le palier <em>Always Free</em> de Google Cloud Storage.
                  Les <strong>{billableGb.toFixed(2)} Go supplémentaires</strong> sont facturés au tarif officiel Standard Storage de ~0,020 $ / Go / mois, soit environ <strong>{estimatedMonthlyStorageCost.toFixed(2)} $ / mois</strong>.
                </p>
                <p className="text-[11px] text-amber-300 mt-2">
                  Conseil : Vous pouvez supprimer les vidéos inutiles ou passer sur un stockage S3 économique comme Wasabi ou Backblaze B2 pour le gros volume.
                </p>
              </div>
            </div>
          ) : isNearLimit ? (
            <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/50 text-amber-200 flex items-start gap-3.5 shadow-lg">
              <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white">
                  Avertissement : Vous approchez de la limite du palier gratuit ({(usedGb).toFixed(2)} / 5,0 Go)
                </h4>
                <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                  Vous avez consommé <strong>{percentOfFreeTier}%</strong> des 5 Go gratuits de Google Cloud Storage. Tout nouveau fichier vidéo volumineux qui dépassera les 5 Go commencera à être facturé à 0,020 $/Go/mois.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <h4 className="text-xs md:text-sm font-bold text-white">
                    Palier Gratuit Google Cloud Respecté (0,00 $ / mois)
                  </h4>
                  <p className="text-xs text-emerald-300/80 mt-0.5">
                    Vos {formatBytes(effectiveCloudBytes)} de vidéos sont 100% inclus dans les 5 Go gratuits à vie offerts par Google Cloud Storage.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-400 whitespace-nowrap">
                GCS Always Free
              </span>
            </div>
          )}

          {/* 4 Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Cloud Storage Used */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Stockage Cloud</span>
                  <Cloud className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {formatBytes(effectiveCloudBytes)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Sur 5,0 Go offerts ({percentOfFreeTier}%)
                </p>
              </div>

              {/* Progress bar towards 5GB */}
              <div className="mt-4 pt-3 border-t border-slate-800">
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isExceeded
                        ? 'bg-amber-500'
                        : isNearLimit
                        ? 'bg-amber-400'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, (usedGb / freeTierGb) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Number of Videos */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Vidéos Répertoriées</span>
                  <Film className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {effectiveVideoCount}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {moviesCount} {moviesCount > 1 ? 'films' : 'film'} • {seriesCount} {seriesCount > 1 ? 'séries' : 'série'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Taille moyenne :</span>
                <span className="text-slate-200 font-semibold">
                  {effectiveVideoCount > 0
                    ? formatBytes(effectiveCloudBytes / effectiveVideoCount)
                    : '0 B'}
                </span>
              </div>
            </div>

            {/* Card 3: Offline Downloads Space */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Copies Hors Ligne</span>
                  <WifiOff className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {formatBytes(offlineUsedBytes)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {offlineItems.length} vidéo(s) sur la mémoire appareil
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Quota navigateur :</span>
                <span className="text-slate-200 font-semibold">
                  {deviceQuota.quotaBytes > 0 ? formatBytes(deviceQuota.quotaBytes) : 'Géré par OS'}
                </span>
              </div>
            </div>

            {/* Card 4: Estimated GCS Monthly Cost */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Coût Estimé GCS</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  {estimatedMonthlyStorageCost === 0 ? '0,00 $' : `${estimatedMonthlyStorageCost.toFixed(2)} $`}
                  <span className="text-xs font-normal text-slate-400"> / mois</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isExceeded ? `${billableGb.toFixed(2)} Go facturables` : '100% couvert par le palier gratuit'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] flex items-center justify-between">
                <span className="text-slate-400">Statut facturation :</span>
                <span className={`font-semibold ${isExceeded ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {isExceeded ? 'Facturé' : 'Gratuit'}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed GCS Cost Breakdown & Account Limits */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Table of Official Google Cloud Storage Pricing */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                <DollarSign className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Détail de la Facturation Google Cloud Storage (Standard)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tarifs officiels GCP actuels applicables aux régions US / Europe
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                {/* Line 1: Storage */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">Stockage au repos (Standard Storage)</p>
                    <p className="text-[11px] text-slate-400">
                      5,0 Go gratuits / mois • puis ~0,020 $ / Go / mois
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">
                      {estimatedMonthlyStorageCost === 0 ? '0,00 $' : `${estimatedMonthlyStorageCost.toFixed(2)} $`}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {billableGb > 0 ? `${billableGb.toFixed(2)} Go payants` : '5 Go inclus'}
                    </p>
                  </div>
                </div>

                {/* Line 2: Egress */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">Bande passante sortante (Streaming Egress)</p>
                    <p className="text-[11px] text-slate-400">
                      100 Go gratuits / mois • puis 0,12 $ / Go (équivaut à ~65h de streaming 1080p)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-400">0,00 $</p>
                    <p className="text-[10px] text-emerald-400/80">Inclus (100 Go/m)</p>
                  </div>
                </div>

                {/* Line 3: Class A Operations */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">Opérations de classe A (Uploads / Insertions)</p>
                    <p className="text-[11px] text-slate-400">
                      5 000 requêtes gratuites / mois • puis 0,05 $ pour 10 000 requêtes
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-400">0,00 $</p>
                    <p className="text-[10px] text-slate-400">Usage standard</p>
                  </div>
                </div>

                {/* Line 4: Class B Operations */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">Opérations de classe B (Streaming / Range Requests)</p>
                    <p className="text-[11px] text-slate-400">
                      50 000 requêtes gratuites / mois • puis 0,004 $ pour 10 000 requêtes
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-400">0,00 $</p>
                    <p className="text-[10px] text-slate-400">50k incluses</p>
                  </div>
                </div>
              </div>

              {/* Total Row */}
              <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300">
                  Total Estimé Mensuel Facturé par Google Cloud
                </span>
                <span className="text-base font-extrabold text-white">
                  {estimatedMonthlyStorageCost === 0 ? '0,00 $ (Gratuit)' : `${estimatedMonthlyStorageCost.toFixed(2)} $ / mois`}
                </span>
              </div>
            </div>

            {/* Applicable Account & Device Limits */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Limites du Compte & Quotas</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400">Palier Gratuit GCS :</span>
                    <p className="font-bold text-white">5,0 Go de stockage Standard</p>
                  </div>

                  <div>
                    <span className="text-slate-400">Quota Streaming Egress :</span>
                    <p className="font-bold text-white">100 Go / mois (Zone Amérique du Nord)</p>
                  </div>

                  <div>
                    <span className="text-slate-400">Taille maximale par vidéo :</span>
                    <p className="font-bold text-white">Illimitée (Découpage en chunks de 3 Mo)</p>
                  </div>

                  <div>
                    <span className="text-slate-400">Base de données Cloud Firestore :</span>
                    <p className="font-bold text-white">50 000 lectures / jour (Spark / Enterprise)</p>
                  </div>

                  <div>
                    <span className="text-slate-400">Stockage local de l'appareil (PWA) :</span>
                    <p className="font-bold text-white">
                      {deviceQuota.quotaBytes > 0
                        ? `${formatBytes(deviceQuota.quotaBytes)} (dépendant du téléphone)`
                        : 'Contrôlé par le système d\'exploitation'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                <Info className="w-3.5 h-3.5 text-indigo-400 inline mr-1" />
                Les quotas sont réinitialisés le premier jour de chaque mois calendrier.
              </div>
            </div>
          </div>

          {/* Interactive What-If Cost Projection Calculator */}
          <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/30 border border-slate-800 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">
                Simulateur de Projections de Coûts (What-If)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Ajustez le curseur pour simuler ce que vous coûterait une vidéothèque plus importante sur Google Cloud Storage et comparez avec d'autres fournisseurs de stockage objet.
            </p>

            {/* Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-300">Volume simulé dans le Cloud :</span>
                <span className="text-lg font-black text-indigo-400">{simulatedGb} Go</span>
              </div>
              <input
                type="range"
                min={0}
                max={500}
                step={5}
                value={simulatedGb}
                onChange={(e) => setSimulatedGb(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>0 Go (Gratuit)</span>
                <span>100 Go</span>
                <span>250 Go</span>
                <span>500 Go</span>
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">Préréglages rapides :</span>
              {[5, 25, 50, 100, 250, 500].map((gb) => (
                <button
                  key={gb}
                  onClick={() => setSimulatedGb(gb)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    simulatedGb === gb
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {gb} Go {gb === 5 ? '(Palier Gratuit)' : ''}
                </button>
              ))}
            </div>

            {/* Comparison Cards for the Simulated Volume */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {/* GCS */}
              <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/40">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-white">Google Cloud Storage</span>
                  <span className="text-[10px] text-indigo-400 font-semibold">Actuel</span>
                </div>
                <div className="text-xl font-black text-white mt-2">
                  {simGcsCost === 0 ? '0,00 $' : `${simGcsCost.toFixed(2)} $`}
                  <span className="text-xs font-normal text-slate-400"> / mois</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {simulatedGb <= 5
                    ? '100% gratuit (inclus dans le palier de 5 Go)'
                    : `5 Go gratuits + ${simBillableGb} Go à 0,020 $/Go`}
                </p>
              </div>

              {/* Wasabi */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-white">Wasabi Hot Storage</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Egress 0 $</span>
                </div>
                <div className="text-xl font-black text-white mt-2">
                  {simWasabiCost.toFixed(2)} $
                  <span className="text-xs font-normal text-slate-400"> / mois</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  0,0059 $/Go plat, aucun frais d'API ou de bande passante
                </p>
              </div>

              {/* Backblaze B2 */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-white">Backblaze B2 + CDN</span>
                  <span className="text-[10px] text-purple-400 font-semibold">Économique</span>
                </div>
                <div className="text-xl font-black text-white mt-2">
                  {simBackblazeCost.toFixed(2)} $
                  <span className="text-xs font-normal text-slate-400"> / mois</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  0,006 $/Go, 10 Go gratuits, bande passante gratuite via Cloudflare
                </p>
              </div>
            </div>
          </div>

          {/* Local Device Offline Management Section */}
          <div className="p-6 md:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <WifiOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Gestion de la Mémoire Appareil (Téléchargements Hors Ligne)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Espace utilisé sur la mémoire interne de votre smartphone ou ordinateur par la PWA.
                  </p>
                </div>
              </div>

              {offlineItems.length > 0 && (
                <button
                  onClick={() => setShowPurgeConfirm(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/20 hover:bg-red-950/40 text-red-300 px-3.5 py-2 text-xs font-semibold transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purger les copies locales</span>
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold">Occupation locale actuelle :</span>
                <p className="text-xl font-extrabold text-white mt-1">
                  {formatBytes(offlineUsedBytes)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {offlineItems.length} vidéo(s) enregistrée(s) dans le cache IndexedDB de ce navigateur.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold">Règle de sécurité Cloud :</span>
                <p className="text-xs text-emerald-400 font-medium mt-1">
                  ✓ La suppression locale ne supprime JAMAIS l'original cloud.
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Supprimer une copie locale permet de récupérer instantanément de l'espace sur votre téléphone sans perdre le film de votre compte cloud.
                </p>
              </div>
            </div>

            {/* Confirmation Dialog for Purge */}
            {showPurgeConfirm && (
              <div className="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-xs">
                <p className="font-bold text-white mb-1">
                  Confirmer la suppression de toutes les copies locales ({formatBytes(offlineUsedBytes)}) ?
                </p>
                <p className="text-slate-300 mb-3">
                  Vos vidéos restent en sécurité dans votre Cloud MyCinema. Seuls les fichiers temporaires stockés sur cet appareil seront effacés.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handlePurgeOffline}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
                  >
                    Confirmer la libération d'espace
                  </button>
                  <button
                    onClick={() => setShowPurgeConfirm(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ARCHITECTURE & AES-256 SECURITY */}
      {/* ========================================================= */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          {/* Security & Multi-Zone Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Chiffrement AES-256-GCM</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Données chiffrées au repos (AES-256-GCM) et en transit via TLS 1.3. Isolation stricte par UID.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Redondance Multi-Zone</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Tolérance aux pannes avec réplication distribuée sur 3 zones de disponibilité.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center flex-shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Prometheus & Grafana</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Exposition standardisée sur <code>/metrics</code> pour scraping en temps réel.
                </p>
              </div>
            </div>
          </div>

          {/* Add Sample Demo Video for instant test */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/50 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Tester immédiatement le lecteur</span>
              </div>
              <h3 className="text-base font-bold text-white">
                Ajouter un média de démonstration (Big Buck Bunny 4K)
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Intègre une vidéo libre de droits avec sous-titres français pour valider le streaming et les raccourcis.
              </p>
              {sampleSuccessMessage && (
                <p className="text-xs text-emerald-400 font-semibold mt-2">{sampleSuccessMessage}</p>
              )}
            </div>

            <button
              onClick={handleAddSampleVideo}
              disabled={isAddingSample}
              className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAddingSample ? 'Ajout en cours...' : 'Ajouter vidéo test'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PROMETHEUS RAW METRICS */}
      {/* ========================================================= */}
      {activeTab === 'metrics' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>Flux Prometheus en direct (/metrics)</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">200 OK • text/plain</span>
            </div>
            <pre className="p-4 rounded-xl bg-black/60 border border-slate-900 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-96 leading-relaxed">
              {prometheusRaw || 'Chargement des métriques Prometheus...'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
