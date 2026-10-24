export interface SubtitleTrack {
  id: string;
  label: string;
  lang: string;
  format: 'vtt' | 'srt';
  content: string; // VTT content or data URL
}

export interface MediaItem {
  id: string;
  userId: string;
  title: string;
  type: 'movie' | 'series';
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration?: number;
  thumbnailUrl?: string;
  status: 'ready' | 'uploading' | 'error';
  createdAt: string;
  updatedAt?: string;
  subtitles?: SubtitleTrack[];
  category?: string;
  cloudStorageUrl?: string;
  storageProvider?: 'firebase_gcs' | 'node_server' | 'indexeddb_local';
}

export interface PlaybackProgress {
  id: string;
  userId: string;
  mediaId: string;
  position: number; // in seconds
  duration: number; // in seconds
  completed: boolean;
  lastPlayedAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  storageUsedBytes: number;
  createdAt: string;
}

export interface StorageStats {
  userId: string;
  usedBytes: number;
  videoCount: number;
  quotaBytes: number;
  encryption: string;
  redundancy: string;
  status: string;
}

export interface OfflineMediaMeta {
  mediaId: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  downloadedAt: number;
  duration?: number;
  thumbnailUrl?: string;
  type: 'movie' | 'series';
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}
