export interface UploadProgressInfo {
  percent: number;
  uploadedBytes: number;
  totalBytes: number;
  speedMbps: number;
  etaSeconds: number;
  currentChunk: number;
  totalChunks: number;
}

export interface UploadOptions {
  userId: string;
  file: File;
  onProgress?: (info: UploadProgressInfo) => void;
  signal?: AbortSignal;
}

export async function uploadVideoInChunks(options: UploadOptions): Promise<{ fileId: string; size: number }> {
  const { userId, file, onProgress, signal } = options;
  const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks
  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  const fileId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Step 1: Initialize session
  const initRes = await fetch('/api/storage/upload/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileId,
      userId,
      fileName: file.name,
      totalSize,
      totalChunks,
      mimeType: file.type || 'video/mp4',
    }),
    signal,
  });

  if (!initRes.ok) {
    const errorData = await initRes.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to initialize upload (${initRes.status})`);
  }

  // Step 2: Stream chunks sequentially with retry
  let uploadedBytes = 0;
  const startTime = Date.now();

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    if (signal?.aborted) {
      throw new Error('Upload cancelled by user');
    }

    const startByte = chunkIndex * CHUNK_SIZE;
    const endByte = Math.min(startByte + CHUNK_SIZE, totalSize);
    const chunkBlob = file.slice(startByte, endByte);
    const chunkArrayBuffer = await chunkBlob.arrayBuffer();

    let attempts = 0;
    let chunkUploaded = false;

    while (attempts < 3 && !chunkUploaded) {
      attempts++;
      try {
        const chunkRes = await fetch('/api/storage/upload/chunk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-user-id': userId,
            'x-file-id': fileId,
            'x-chunk-index': chunkIndex.toString(),
            'x-total-chunks': totalChunks.toString(),
          },
          body: chunkArrayBuffer,
          signal,
        });

        if (!chunkRes.ok) {
          throw new Error(`Chunk ${chunkIndex} failed with status ${chunkRes.status}`);
        }

        chunkUploaded = true;
      } catch (err) {
        if (attempts >= 3) {
          throw err;
        }
        // Wait 500ms before retry
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    uploadedBytes += chunkBlob.size;

    // Calculate metrics
    const elapsedSeconds = Math.max(0.1, (Date.now() - startTime) / 1000);
    const speedBytesPerSec = uploadedBytes / elapsedSeconds;
    const speedMbps = Number(((speedBytesPerSec * 8) / (1024 * 1024)).toFixed(1));
    const remainingBytes = totalSize - uploadedBytes;
    const etaSeconds = Math.ceil(remainingBytes / Math.max(1, speedBytesPerSec));
    const percent = Math.min(100, Math.round((uploadedBytes / totalSize) * 100));

    if (onProgress) {
      onProgress({
        percent,
        uploadedBytes,
        totalBytes: totalSize,
        speedMbps,
        etaSeconds,
        currentChunk: chunkIndex + 1,
        totalChunks,
      });
    }
  }

  // Step 3: Complete upload and assemble
  const completeRes = await fetch('/api/storage/upload/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, fileId }),
    signal,
  });

  if (!completeRes.ok) {
    const errorData = await completeRes.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to assemble video file on cloud');
  }

  const completeData = await completeRes.json();
  return { fileId, size: completeData.size || totalSize };
}
