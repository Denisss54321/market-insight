export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? 
  (process.env.NODE_ENV === 'production' ? 'https://market-insight-backend.onrender.com' : 'http://127.0.0.1:8002');

export type ItemRow = {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  icon: string;
  quality: string;
  upgradeLevel: number;
  marketPrice: number | null;
  median: number | null;
  mean: number | null;
  mode: number | null;
  lowestLot: number | null;
  activeLots: number | null;
  liquidity: number | null;
  volatility: number | null;
  spread: number | null;
  confidence: number | null;
  change24h: number | null;
  change7d: number | null;
  sales24h: number | null;
  sampleSize: number | null;
  updatedAt: string | null;
  variants: ItemVariant[];
  minPrice: number | null;
  maxPrice: number | null;
  totalLiquidity: number | null;
};

export type ItemVariant = {
  quality: string;
  upgradeLevel: number;
  marketPrice: number;
  liquidity: number;
  activeLots: number;
  change24h: number;
};

export type FeedLot = {
  itemId: string;
  name: string;
  icon: string;
  price: number;
  unitPrice: number;
  amount: number;
  quality: string;
  upgradeLevel: number;
  marketPrice: number;
  profit: number;
  roi: number;
  expectedProfit: number;
  sellProbability: number;
  confidence: number;
  liquidity: number;
  endsAt: string | null;
  seenAt: string;
  lotKey: string;
};

export type Status = {
  source: string;
  region: string;
  cycles: number;
  last_scan_at: string | null;
  rate_limit_remaining: number | null;
  last_error: string | null;
  clients: number;
  commissionPercent: number;
};

export type MarketSummary = {
  totalItems: number;
  trackedItems: number;
  sales24h: number;
  volume24h: number;
  activeLots: number;
  avgLiquidity: number;
  gainers: TopRow[];
  losers: TopRow[];
  mostLiquid: TopRow[];
  mostVolatile: TopRow[];
  heatmap: HeatCell[];
  events: MarketEvent[];
};

export type TopRow = {
  id: string;
  name: string;
  icon: string;
  marketPrice: number;
  change24h: number;
  liquidity: number;
  volatility: number;
  quality: string;
  upgradeLevel: number;
};

export type HeatCell = {
  category: string;
  items: number;
  change24h: number;
  liquidity: number;
  volume: number;
};

export type MarketEvent = {
  id: number;
  itemId: string;
  name: string;
  type: string;
  magnitude: number;
  message: string;
  happenedAt: string;
  quality: string;
};

export type Deal = {
  id: number;
  itemId: string;
  name: string;
  icon: string;
  state: string;
  amount: number;
  buyPrice: number;
  boughtAt: string;
  marketPriceAtBuy: number;
  marketPriceNow: number;
  listPrice: number | null;
  sellPrice: number | null;
  soldAt: string | null;
  feePercent: number;
  invested: number;
  profit: number;
  roiPercent: number;
  realized: boolean;
  note: string;
  liquidity: number;
};

export type Portfolio = {
  deals: Deal[];
  invested: number;
  realizedProfit: number;
  unrealizedProfit: number;
  openCount: number;
  closedCount: number;
  winRate: number;
  bestDeal: Deal | null;
  worstDeal: Deal | null;
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }
  return (await response.json()) as T;
}

export const iconUrl = (icon: string) => (icon ? icon : "/icons/placeholder.png");
