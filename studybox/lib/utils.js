export const cn = (...a) => a.filter(Boolean).join(" ");

export function formatBytes(bytes) {
  if (bytes == null) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = Number(bytes);
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseLocalDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatDate(value, opts) {
  if (!value) return "-";
  const d = DATE_ONLY.test(value) ? parseLocalDate(value) : new Date(value);
  return d.toLocaleDateString(
    "id-ID",
    opts || { day: "numeric", month: "short", year: "numeric" }
  );
}

export function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseLocalDate(dateStr) - today) / 86400000);
}

export function deadlineLabel(dateStr) {
  const d = daysUntil(dateStr);
  if (d < 0) return `Terlambat ${Math.abs(d)} hari`;
  if (d === 0) return "Hari ini";
  if (d === 1) return "Besok";
  return `${d} hari lagi`;
}

export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} hari lalu`;
  return formatDate(iso);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

export const SUBJECT_COLORS = [
  "#7c5cfc",
  "#a78bfa",
  "#ec7fc2",
  "#5b9dff",
  "#2fbf9b",
  "#f2a33a",
  "#ef6b6b",
  "#1b1530",
];

export function displayName(user) {
  const n = user?.user_metadata?.full_name;
  if (n && n.trim()) return n.trim();
  return (user?.email || "Pelajar").split("@")[0];
}
