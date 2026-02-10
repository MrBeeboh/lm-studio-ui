/** Generate a simple unique id */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Resize/compress image data URLs for vision APIs (avoids LM Studio 400 on large base64).
 * Max dimension 1024px, JPEG 0.85. Returns same URL if not an image data URL.
 * @param {string} dataUrl
 * @returns {Promise<string>}
 */
export function resizeImageForVision(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
    return Promise.resolve(dataUrl);
  }
  const maxDim = 1024;
  const jpegQuality = 0.85;
  return new Promise((resolve, reject) => {
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

/**
 * Resize multiple image data URLs for vision API. Preserves order.
 * @param {string[]} dataUrls
 * @returns {Promise<string[]>}
 */
export async function resizeImageDataUrlsForVision(dataUrls) {
  if (!Array.isArray(dataUrls) || dataUrls.length === 0) return dataUrls;
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
