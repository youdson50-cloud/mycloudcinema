import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  X,
  FastForward,
  Subtitles,
  SkipForward,
  AlertCircle,
  Clock,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import { MediaItem, PlaybackProgress, SubtitleTrack } from '../types';
import { getOfflineMediaBlob } from '../services/indexedDbService';
import { savePlaybackProgress, getPlaybackProgress } from '../services/firestoreService';

interface VideoPlayerModalProps {
  media: MediaItem;
  userId: string;
  allMedia?: MediaItem[];
  onClose: () => void;
  onNextEpisode?: (nextMedia: MediaItem) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  media,
  userId,
  allMedia = [],
  onClose,
  onNextEpisode,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [isOfflineSource, setIsOfflineSource] = useState(false);
  const [loadingSource, setLoadingSource] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);

  // Resume prompt state
  const [savedResumePosition, setSavedResumePosition] = useState<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // Subtitles
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>(media.subtitles || []);
  const [activeSubtitleId, setActiveSubtitleId] = useState<string | null>(null);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [activeSubtitleText, setActiveSubtitleText] = useState<string | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine next episode if series
  const nextEpisode = React.useMemo(() => {
    if (media.type !== 'series' || !media.seriesTitle || media.seasonNumber === undefined || media.episodeNumber === undefined) {
      return null;
    }
    return allMedia.find(
      (m) =>
        m.type === 'series' &&
        m.seriesTitle?.toLowerCase() === media.seriesTitle?.toLowerCase() &&
        m.seasonNumber === media.seasonNumber &&
        m.episodeNumber === (media.episodeNumber || 0) + 1
    );
  }, [media, allMedia]);

  // Load video source (Check Offline IndexedDB first, else stream from backend)
  useEffect(() => {
    let active = true;
    let objectUrlToRevoke: string | null = null;

    async function loadStream() {
      setLoadingSource(true);
      setPlayerError(null);

      try {
        // Check local offline storage
        const offlineBlob = await getOfflineMediaBlob(media.id);
        if (offlineBlob && active) {
          const url = URL.createObjectURL(offlineBlob);
          objectUrlToRevoke = url;
          setVideoSrc(url);
          setIsOfflineSource(true);
          setLoadingSource(false);
          return;
        }

        // Stream from server with HTTP 206 Range support
        if (active) {
          const streamUrl = `/api/storage/stream/${userId}/${media.fileId}`;
          setVideoSrc(streamUrl);
          setIsOfflineSource(false);
          setLoadingSource(false);
        }
      } catch (err: any) {
        if (active) {
          console.error('Failed to load video stream:', err);
          setPlayerError('Impossible de charger le flux vidéo.');
          setLoadingSource(false);
        }
      }
    }

    loadStream();

    // Check saved resume point in Firestore
    getPlaybackProgress(userId, media.id)
      .then((progress) => {
        if (progress && progress.position > 15 && !progress.completed) {
          setSavedResumePosition(progress.position);
          setShowResumePrompt(true);
        }
      })
      .catch(() => {
        // ignore progress fetch error
      });

    return () => {
      active = false;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [media.id, media.fileId, userId]);

  // Auto-save progress every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused && duration > 0) {
        const pos = videoRef.current.currentTime;
        const isCompleted = duration > 0 && pos / duration >= 0.95;
        savePlaybackProgress({
          id: `${userId}_${media.id}`,
          userId,
          mediaId: media.id,
          position: Math.floor(pos),
          duration: Math.floor(duration),
          completed: isCompleted,
          lastPlayedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [userId, media.id, duration]);

  // Save progress on close or unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && duration > 0) {
        const pos = videoRef.current.currentTime;
        const isCompleted = duration > 0 && pos / duration >= 0.95;
        savePlaybackProgress({
          id: `${userId}_${media.id}`,
          userId,
          mediaId: media.id,
          position: Math.floor(pos),
          duration: Math.floor(duration),
          completed: isCompleted,
          lastPlayedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    };
  }, [userId, media.id, duration]);

  // Controls auto-hide timer
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSubtitleMenu(false);
      }
    }, 3500);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekDelta(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekDelta(10);
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'Escape':
          if (!isFullscreen) onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isFullscreen, volume, isMuted]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch((err) => {
        console.warn('Playback error:', err);
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      // Save on pause
      if (duration > 0) {
        savePlaybackProgress({
          id: `${userId}_${media.id}`,
          userId,
          mediaId: media.id,
          position: Math.floor(videoRef.current.currentTime),
          duration: Math.floor(duration),
          completed: false,
          lastPlayedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    }
  };

  const seekDelta = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const resumeAtSavedPosition = () => {
    if (savedResumePosition && videoRef.current) {
      videoRef.current.currentTime = savedResumePosition;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    setShowResumePrompt(false);
  };

  const startFromBeginning = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    setShowResumePrompt(false);
  };

  // Subtitle file upload on the fly
  const handleUploadSubtitle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let vttContent = text;

      if (file.name.endsWith('.srt')) {
        // Convert via backend API
        const res = await fetch('/api/subtitles/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ srtContent: text }),
        });
        const data = await res.json();
        if (data.vtt) {
          vttContent = data.vtt;
        }
      }

      const newTrack: SubtitleTrack = {
        id: `sub_${Date.now()}`,
        label: file.name.replace(/\.[^/.]+$/, ''),
        lang: 'fr',
        format: 'vtt',
        content: vttContent,
      };

      setSubtitles((prev) => [...prev, newTrack]);
      setActiveSubtitleId(newTrack.id);
      setShowSubtitleMenu(false);
    } catch (err) {
      console.error('Subtitle upload failed:', err);
    }
  };

  // Custom subtitle parser for on-screen rendering
  useEffect(() => {
    if (!activeSubtitleId) {
      setActiveSubtitleText(null);
      return;
    }

    const currentTrack = subtitles.find((s) => s.id === activeSubtitleId);
    if (!currentTrack || !currentTrack.content) {
      setActiveSubtitleText(null);
      return;
    }

    // Parse simple VTT cues
    const cues: { start: number; end: number; text: string }[] = [];
    const timeRegex = /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/;

    const blocks = currentTrack.content.split(/\n\s*\n/);
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      for (let i = 0; i < lines.length; i++) {
        const match = timeRegex.exec(lines[i]);
        if (match) {
          const start =
            parseInt(match[1]) * 3600 +
            parseInt(match[2]) * 60 +
            parseInt(match[3]) +
            parseInt(match[4]) / 1000;
          const end =
            parseInt(match[5]) * 3600 +
            parseInt(match[6]) * 60 +
            parseInt(match[7]) +
            parseInt(match[8]) / 1000;
          const text = lines.slice(i + 1).join('\n');
          cues.push({ start, end, text });
          break;
        }
      }
    }

    const activeCue = cues.find((c) => currentTime >= c.start && currentTime <= c.end);
    setActiveSubtitleText(activeCue ? activeCue.text : null);
  }, [currentTime, activeSubtitleId, subtitles]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black select-none overflow-hidden"
    >
      {/* Video Element */}
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
          onTimeUpdate={() => {
            if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
              setLoadingSource(false);
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            if (nextEpisode && onNextEpisode) {
              onNextEpisode(nextEpisode);
            }
          }}
          onError={(e) => {
            console.error('Native video error:', e);
            setPlayerError(
              'Format ou codec non pris en charge nativement par ce navigateur (ex: conteneur MKV ou codec audio AC3/DTS non standard). Les formats recommandés sont MP4 (H.264 / AAC) ou WebM.'
            );
          }}
          playsInline
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
          <Clock className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm">Connexion au stockage cloud distant...</p>
        </div>
      )}

      {/* Subtitle On-Screen Overlay */}
      {activeSubtitleText && (
        <div className="absolute bottom-24 inset-x-0 flex justify-center pointer-events-none px-6 z-20">
          <div className="bg-black/80 text-white text-base md:text-xl font-medium px-4 py-2 rounded-lg shadow-2xl backdrop-blur-sm text-center max-w-2xl whitespace-pre-line border border-white/10">
            {activeSubtitleText}
          </div>
        </div>
      )}

      {/* Resume Playback Prompt Overlay */}
      {showResumePrompt && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Reprendre la lecture ?</h3>
            <p className="mt-2 text-xs text-slate-300">
              Vous vous étiez arrêté à <strong className="text-indigo-400">{formatTime(savedResumePosition || 0)}</strong>. Souhaitez-vous continuer là où vous en étiez ?
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={resumeAtSavedPosition}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition cursor-pointer"
              >
                Reprendre à {formatTime(savedResumePosition || 0)}
              </button>
              <button
                onClick={startFromBeginning}
                className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                Recommencer au début
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Codec / Player Error Display */}
      {playerError && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 p-6">
          <div className="max-w-lg rounded-2xl bg-red-950/40 border border-red-500/30 p-6 text-center text-slate-200">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-2">Erreur de lecture vidéo</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">{playerError}</p>
            <div className="text-left bg-black/40 p-3 rounded-xl border border-red-900/30 text-[11px] text-slate-400 mb-5 space-y-1">
              <p>• <strong>Fichier :</strong> {media.fileName}</p>
              <p>• <strong>Taille :</strong> {(media.fileSize / (1024 * 1024)).toFixed(1)} Mo</p>
              <p>• <strong>Conseil :</strong> Convertissez la vidéo en MP4 (H.264/AAC) pour une compatibilité totale sur mobile et Web.</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2 text-xs font-medium text-white transition"
            >
              Fermer le lecteur
            </button>
          </div>
        </div>
      )}

      {/* Controls Overlay Header */}
      <div
        className={`absolute top-0 inset-x-0 p-4 md:p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center transition cursor-pointer border border-white/10"
            title="Fermer (Échap)"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm md:text-base font-semibold text-white truncate max-w-md">
              {media.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {media.type === 'series' && (
                <span>
                  {media.seriesTitle} — S{media.seasonNumber || 1}:E{media.episodeNumber || 1}
                </span>
              )}
              {isOfflineSource ? (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <WifiOff className="w-3 h-3" /> Copie locale hors ligne
                </span>
              ) : (
                <span className="text-indigo-400">Streaming Cloud sécurisé (HTTP 206)</span>
              )}
            </div>
          </div>
        </div>

        {/* Next episode button if available */}
        {nextEpisode && onNextEpisode && (
          <button
            onClick={() => onNextEpisode(nextEpisode)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-medium text-white shadow-lg transition cursor-pointer"
          >
            <span>Épisode suivant</span>
            <SkipForward className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Controls Bottom Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 p-4 md:p-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-3 transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Timeline Slider */}
        <div className="flex items-center gap-3 group">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2.5 transition-all"
          />
        </div>

        {/* Buttons and toggles */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white text-black hover:bg-slate-200 flex items-center justify-center transition cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {/* Rewind 10s */}
            <button
              onClick={() => seekDelta(-10)}
              className="text-slate-300 hover:text-white transition p-1.5"
              title="Reculer de 10s (Flèche Gauche)"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Fast Forward 10s */}
            <button
              onClick={() => seekDelta(10)}
              className="text-slate-300 hover:text-white transition p-1.5"
              title="Avancer de 10s (Flèche Droite)"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            {/* Volume */}
            <div className="hidden sm:flex items-center gap-2 text-slate-300">
              <button onClick={toggleMute} className="hover:text-white p-1">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-700 rounded appearance-none accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Time display */}
            <span className="text-xs text-slate-300 font-mono tracking-wider">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Speed selector */}
            <div className="relative group">
              <button
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700"
              >
                {playbackRate}x
              </button>
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:flex flex-col bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-2xl min-w-[70px]">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRateChange(r)}
                    className={`px-3 py-1.5 text-xs text-left rounded-lg transition ${
                      playbackRate === r ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {r}x
                  </button>
                ))}
              </div>
            </div>

            {/* Subtitles menu button */}
            <div className="relative">
              <button
                onClick={() => setShowSubtitleMenu(!showSubtitleMenu)}
                className={`p-2 rounded-xl transition ${
                  activeSubtitleId
                    ? 'text-indigo-400 bg-indigo-950/60 border border-indigo-500/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Sous-titres"
              >
                <Subtitles className="w-5 h-5" />
              </button>

              {showSubtitleMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-64 rounded-2xl bg-slate-900/95 border border-slate-800 p-3 shadow-2xl backdrop-blur-md text-xs text-slate-200">
                  <div className="font-semibold text-white mb-2 pb-1.5 border-b border-slate-800 flex items-center justify-between">
                    <span>Sous-titres</span>
                    <label className="text-[10px] text-indigo-400 hover:text-indigo-300 cursor-pointer font-normal underline">
                      Importer .srt/.vtt
                      <input
                        type="file"
                        accept=".srt,.vtt"
                        onChange={handleUploadSubtitle}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setActiveSubtitleId(null);
                        setShowSubtitleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg transition ${
                        activeSubtitleId === null ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800'
                      }`}
                    >
                      Désactivés
                    </button>
                    {subtitles.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => {
                          setActiveSubtitleId(sub.id);
                          setShowSubtitleMenu(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg transition truncate ${
                          activeSubtitleId === sub.id ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-800'
                        }`}
                      >
                        {sub.label} ({sub.lang.toUpperCase()})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-slate-300 hover:text-white p-2 transition cursor-pointer"
              title="Plein écran (F)"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
