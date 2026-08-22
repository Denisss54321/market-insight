const numberFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const preciseFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
const liquidityFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });

export const money = (value: number) => `${numberFormat.format(Math.round(value))}\u00A0₽`;
export const num = (value: number) => numberFormat.format(Math.round(value));
export const precise = (value: number) => preciseFormat.format(value);
export const liquidity = (value: number) => liquidityFormat.format(value);

export const percent = (value: number, digits = 1) =>
  `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;

export const compact = (value: number) => {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} млрд`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} млн`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)} тыс`;
  return numberFormat.format(Math.round(value));
};

export const timeAgo = (iso: string | null) => {
  if (!iso) return "—";
  const stamp = new Date(iso.endsWith("Z") ? iso : `${iso}Z`).getTime();
  const seconds = Math.max(0, Math.round((Date.now() - stamp) / 1000));
  if (seconds < 60) return `${seconds} с назад`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} мин назад`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} ч назад`;
  return `${Math.round(seconds / 86400)} д назад`;
};

export const timeLeft = (iso: string | null) => {
  if (!iso) return "—";
  const stamp = new Date(iso.endsWith("Z") ? iso : `${iso}Z`).getTime();
  const seconds = Math.round((stamp - Date.now()) / 1000);
  if (seconds <= 0) return "истёк";
  if (seconds < 3600) return `${Math.round(seconds / 60)} мин`;
  return `${Math.floor(seconds / 3600)} ч ${Math.round((seconds % 3600) / 60)} мин`;
};

export const CATEGORY_NAMES: Record<string, string> = {
  biochemical: "Биохимические",
  electrophysical: "Электрофизические",
  gravity: "Гравитационные",
  thermal: "Термические",
  other_arts: "Прочие",
};

export const categoryName = (id: string) => CATEGORY_NAMES[id] ?? id;

export const QUALITY_COLORS: Record<string, string> = {
  "Обычный": "#ffffff",
  "Необычный": "#22c55e",
  "Особый": "#3b82f6",
  "Редкий": "#9333ea",
  "Исключительный": "#ef4444",
  "Легендарный": "#eab308",
  "Уникальный": "#df95e8",
};

export const qualityToString = (quality: number) => {
  if (quality >= 176) return "Уникальный";
  if (quality >= 161) return "Легендарный";
  if (quality >= 146) return "Исключительный";
  if (quality >= 131) return "Редкий";
  if (quality >= 116) return "Особый";
  if (quality >= 101) return "Необычный";
  return "Обычный";
};

export const qualityColor = (quality: string) => QUALITY_COLORS[quality] ?? "#ffffff";
