/** Generate a simple unique id */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Resize/compress image data URLs for vision APIs (avoids LM Studio 400 on large base64).
 * Always re-encodes to JPEG for smaller payload; max dimension 768px for non-Qwen models.
 * @param {string} dataUrl
 * @returns {Promise<string>}
 */
export function resizeImageForVision(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
    return Promise.resolve(dataUrl);
  }
  const maxDim = 768;
  const jpegQuality = 0.8;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const out = canvas.toDataURL('image/jpeg', jpegQuality);
        resolve(out || dataUrl);
      } catch (e) {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Approximate max payload size (bytes) for images below which we skip resize. */
const VISION_SKIP_RESIZE_BELOW_BYTES = 1 * 1024 * 1024; // 1 MB

/**
 * Resize multiple image data URLs for vision API. Preserves order.
 * Skips resize entirely if total base64 payload is already under 1 MB.
 * @param {string[]} dataUrls
 * @returns {Promise<string[]>}
 */
export async function resizeImageDataUrlsForVision(dataUrls) {
  if (!Array.isArray(dataUrls) || dataUrls.length === 0) return dataUrls;
  const totalBytes = dataUrls.reduce((sum, url) => sum + (typeof url === 'string' ? Math.floor((url.length * 3) / 4) : 0), 0);
  if (totalBytes <= VISION_SKIP_RESIZE_BELOW_BYTES) return dataUrls;
  return Promise.all(dataUrls.map(resizeImageForVision));
}

/**
 * True if this model is Qwen-VL 4B or 8B — those work with full-size images; skip resize to preserve quality.
 * @param {string} [modelId]
 * @returns {boolean}
 */
export function shouldSkipImageResizeForVision(modelId) {
  if (!modelId || typeof modelId !== 'string') return false;
  const lower = modelId.toLowerCase();
  return /qwen.*vl.*(4b|8b)|(4b|8b).*qwen.*vl/.test(lower);
}

/** Format date for sidebar list */
export function formatTime(date) {
  const d = typeof date === 'number' ? new Date(date) : date;
  const now = new Date();
  const diff = now - d;
  if (diff < 60_000) return 'Just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return d.toLocaleDateString();
}

/** Group conversations by date: Today, Yesterday, This week, Older */
export function groupByDate(conversations) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400_000;
  const weekAgo = today - 7 * 86400_000;

  const groups = { today: [], yesterday: [], week: [], older: [] };
  for (const c of conversations || []) {
    const ts = c.updatedAt ?? c.createdAt ?? 0;
    if (ts >= today) groups.today.push(c);
    else if (ts >= yesterday) groups.yesterday.push(c);
    else if (ts >= weekAgo) groups.week.push(c);
    else groups.older.push(c);
  }
  return groups;
}
