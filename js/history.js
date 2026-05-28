const HISTORY_KEY = 'image_toolkit_history';
const HISTORY_MAX = 20;

function addHistory(toolName, fileName, originalSize, resultSize) {
  const entry = {
    toolName,
    fileName,
    originalSize,
    resultSize,
    timestamp: Date.now(),
  };
  const history = getHistory();
  history.unshift(entry);
  if (history.length > HISTORY_MAX) {
    history.length = HISTORY_MAX;
  }
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    // localStorage full or unavailable, silently ignore
  }
}

function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    return [];
  }
}

function timeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return minutes + '分钟前';
  if (hours < 24) return hours + '小时前';
  if (days < 2) return '昨天';
  if (days < 30) return days + '天前';
  const months = Math.floor(days / 30);
  if (months < 12) return months + '个月前';
  return Math.floor(months / 12) + '年前';
}
