import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { MediaItem, PlaybackProgress } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// -------------------------------------------------------------
// LOCAL FALLBACK STORE FOR UNAUTHENTICATED / DEMO SESSIONS
// -------------------------------------------------------------
const localListeners = new Set<() => void>();

function notifyLocalChange() {
  localListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore
    }
  });
}

function getLocalMediaStore(userId: string): MediaItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`mycloud_media_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return [];
}

function setLocalMediaStore(userId: string, items: MediaItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`mycloud_media_${userId}`, JSON.stringify(items));
    notifyLocalChange();
  } catch {
    // fallback
  }
}

function getLocalProgressStore(userId: string): Record<string, PlaybackProgress> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`mycloud_progress_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return {};
}

function setLocalProgressStore(userId: string, progress: Record<string, PlaybackProgress>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`mycloud_progress_${userId}`, JSON.stringify(progress));
  } catch {
    // fallback
  }
}

// -------------------------------------------------------------
// MEDIA OPERATIONS
// -------------------------------------------------------------

export async function getUserMediaList(userId: string): Promise<MediaItem[]> {
  // If user is not authenticated with Firebase Auth, serve from local store
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return getLocalMediaStore(userId);
  }

  const pathForGetDocs = 'media';
  try {
    const q = query(collection(db, pathForGetDocs), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const items: MediaItem[] = [];
    snapshot.forEach((docSnap) => {
      items.push(docSnap.data() as MediaItem);
    });
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, pathForGetDocs);
    return [];
  }
}

export function subscribeUserMedia(
  userId: string,
  onUpdate: (items: MediaItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  // Skill check: Only attach onSnapshot if auth is ready and user is authenticated
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    // Return local store data and subscribe to local changes
    const handler = () => {
      onUpdate(getLocalMediaStore(userId));
    };
    localListeners.add(handler);
    handler(); // initial emit
    return () => {
      localListeners.delete(handler);
    };
  }

  const pathForQuery = 'media';
  const q = query(collection(db, pathForQuery), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: MediaItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as MediaItem);
      });
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, pathForQuery);
      } catch (err: any) {
        if (onError) onError(err);
      }
    }
  );
}

// Helper to recursively strip undefined fields which Firestore rejects
export function cleanFirestoreData<T extends Record<string, any>>(data: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        clean[key] = cleanFirestoreData(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean;
}

export async function saveMediaItem(item: MediaItem): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== item.userId) {
    const current = getLocalMediaStore(item.userId);
    const filtered = current.filter((m) => m.id !== item.id);
    setLocalMediaStore(item.userId, [item, ...filtered]);
    return;
  }

  const pathForWrite = `media/${item.id}`;
  try {
    const cleaned = cleanFirestoreData(item);
    await setDoc(doc(db, 'media', item.id), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, pathForWrite);
  }
}

export async function updateMediaItem(arg1: string, arg2: string | Partial<MediaItem>, arg3?: Partial<MediaItem>): Promise<void> {
  const userId = arg3 ? arg1 : (auth.currentUser?.uid || 'demo_user');
  const mediaId = arg3 ? (arg2 as string) : arg1;
  const updates = (arg3 ? arg3 : arg2) as Partial<MediaItem>;

  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    const current = getLocalMediaStore(userId);
    const updated = current.map((m) => (m.id === mediaId ? { ...m, ...updates } : m));
    setLocalMediaStore(userId, updated);
    return;
  }

  const pathForUpdate = `media/${mediaId}`;
  try {
    const cleaned = cleanFirestoreData(updates);
    await updateDoc(doc(db, 'media', mediaId), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, pathForUpdate);
  }
}

export async function deleteMediaItem(arg1: string, arg2?: string): Promise<void> {
  const userId = arg2 ? arg1 : (auth.currentUser?.uid || 'demo_user');
  const mediaId = arg2 ? arg2 : arg1;

  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    const current = getLocalMediaStore(userId);
    setLocalMediaStore(userId, current.filter((m) => m.id !== mediaId));
    return;
  }

  const pathForDelete = `media/${mediaId}`;
  try {
    await deleteDoc(doc(db, 'media', mediaId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pathForDelete);
  }
}

// -------------------------------------------------------------
// PLAYBACK PROGRESS OPERATIONS
// -------------------------------------------------------------

export async function getPlaybackProgress(userId: string, mediaId: string): Promise<PlaybackProgress | null> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    const store = getLocalProgressStore(userId);
    return store[mediaId] || null;
  }

  const progressId = `${userId}_${mediaId}`;
  const pathForGet = `playback_progress/${progressId}`;
  try {
    const snap = await getDoc(doc(db, 'playback_progress', progressId));
    if (snap.exists()) {
      return snap.data() as PlaybackProgress;
    }
    return null;
  } catch (error: any) {
    // If not created yet or permission evaluation on non-existent document
    console.warn(`No progress document found for ${progressId} (${error?.message || 'new media'})`);
    return null;
  }
}

export async function savePlaybackProgress(progress: PlaybackProgress): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== progress.userId) {
    const store = getLocalProgressStore(progress.userId);
    store[progress.mediaId] = {
      ...progress,
      lastPlayedAt: new Date().toISOString(),
    };
    setLocalProgressStore(progress.userId, store);
    return;
  }

  const progressId = progress.id || `${progress.userId}_${progress.mediaId}`;
  const pathForWrite = `playback_progress/${progressId}`;
  try {
    const cleaned = cleanFirestoreData({
      ...progress,
      id: progressId,
      lastPlayedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'playback_progress', progressId), cleaned);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForWrite);
  }
}

export async function getUserAllProgress(userId: string): Promise<Record<string, PlaybackProgress>> {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    return getLocalProgressStore(userId);
  }

  const pathForList = 'playback_progress';
  try {
    const q = query(collection(db, pathForList), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const progressMap: Record<string, PlaybackProgress> = {};
    snapshot.forEach((snap) => {
      const data = snap.data() as PlaybackProgress;
      progressMap[data.mediaId] = data;
    });
    return progressMap;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, pathForList);
    return {};
  }
}
