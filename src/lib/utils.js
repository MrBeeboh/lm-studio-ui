/** Generate a simple unique id */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
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
