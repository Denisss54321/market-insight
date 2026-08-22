"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";

import LiveFeed from "@/components/LiveFeed";
import AuthRequired from "@/components/AuthRequired";
import { AnimatedNumber, Card, Delta, EmptyState, KpiCard, Skeleton } from "@/components/ui";
import { ItemRow, MarketSummary, Status, TopRow, api } from "@/lib/api";
import { categoryName, compact, money, num, qualityColor, timeAgo } from "@/lib/format";

function TopList({ rows, metric }: { rows: TopRow[]; metric: "change" | "liquidity" }) {
  if (!rows.length) return <Skeleton className="h-24" />;
  return (
    <ul className="space-y-1.5">
      {rows.map((row, index) => (
        <li key={`${row.id}-${metric}-${index}`}>
          <Link
            href={`/item/${row.id}?quality=${encodeURIComponent(row.quality)}&upgrade_level=${row.upgradeLevel}`}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={row.icon} alt="" className="h-6 w-6" />
            <div className="flex flex-col">
              <span className="truncate text-sm" style={{ color: qualityColor(row.quality) }}>{row.name}</span>
              {row.quality && (
                <span className="text-xs text-muted">{row.quality}</span>
              )}
            </div>
            <span className="ml-auto num text-xs text-muted">{money(row.marketPrice)}</span>
            {metric === "change" ? (
              <Delta value={row.change24h} />
            ) : (
              <span className="num text-sm text-primary">{num(row.liquidity)}/д</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [watch, setWatch] = useState<{ itemId: string; item: ItemRow | null }[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const loadWatchlist = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setWatch([]);
      return;
    }
    api<{ itemId: string; item: ItemRow | null }[]>(`/api/watchlist?token=${token}`)
      .then(setWatch)
      .catch(() => setWatch([]));
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('auth_token');
      setIsAuthenticated(!!token);
      setAuthLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const load = () => {
      api<MarketSummary>("/api/market/summary").then(setSummary).catch(() => undefined);
      api<Status>("/api/status").then(setStatus).catch(() => undefined);
      loadWatchlist();
    };
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [loadWatchlist]);

  return (
    <div className="space-y-8">
      {/* Hero секция */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            Рынок артефактов
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Отслеживай цены, анализируй динамику и принимай взвешенные решения
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-primary font-medium">Live</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Обновление каждые 10 секунд
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI карточки - новый layout */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-green-500/5 p-6 hover:border-green-500/30 transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Артефактов в базе</div>
              <div className="text-3xl font-bold text-green-400">
                <AnimatedNumber value={summary?.totalItems ?? 0} format={(v) => num(v)} />
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {summary?.trackedItems ?? 0} с метриками
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <div className="text-2xl">📦</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-6 hover:border-blue-500/30 transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Сделок за 24 ч</div>
              <div className="text-3xl font-bold text-blue-400">
                <AnimatedNumber value={summary?.sales24h ?? 0} format={(v) => num(v)} />
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Завершённых продаж
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <div className="text-2xl">💰</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-primary/10 to-primary/5 p-6 hover:border-primary/30 transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Оборот за 24 ч</div>
              <div className="text-3xl font-bold text-primary">
                <AnimatedNumber value={summary?.volume24h ?? 0} format={(v) => compact(v)} />
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Общий объём торгов
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <div className="text-2xl">📊</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-6 hover:border-purple-500/30 transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Активных лотов</div>
              <div className="text-3xl font-bold text-purple-400">
                <AnimatedNumber value={summary?.activeLots ?? 0} format={(v) => num(v)} />
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                На рынке сейчас
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <div className="text-2xl">🎯</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-6 hover:border-orange-500/30 transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Средняя ликвидность</div>
              <div className="text-3xl font-bold text-orange-400">
                <AnimatedNumber value={summary?.avgLiquidity ?? 0} format={(v) => num(v)} />
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Продаж в день
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <div className="text-2xl">⚡</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-6 hover:border-emerald-500/30 transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Синхронизация</div>
              <div className="text-3xl font-bold text-emerald-400">
                {status ? timeAgo(status.last_scan_at) : "—"}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {status ? `${status.source} · ${status.cycles} циклов` : "нет связи"}
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <div className="text-2xl">🔄</div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <LiveFeed onWatchlistChange={loadWatchlist} />

      {/* Лидеры рынка - новый дизайн */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="grid gap-4 lg:grid-cols-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="relative overflow-hidden rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-500/5 p-5 hover:border-green-500/40 transition-all"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="text-2xl">🚀</div>
            <h3 className="text-lg font-semibold text-green-400">Лидеры роста</h3>
          </div>
          <TopList rows={summary?.gainers ?? []} metric="change" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-red-500/5 p-5 hover:border-red-500/40 transition-all"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="text-2xl">📉</div>
            <h3 className="text-lg font-semibold text-red-400">Лидеры падения</h3>
          </div>
          <TopList rows={summary?.losers ?? []} metric="change" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-5 hover:border-blue-500/40 transition-all"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="text-2xl">💧</div>
            <h3 className="text-lg font-semibold text-blue-400">Самые ликвидные</h3>
          </div>
          <TopList rows={summary?.mostLiquid ?? []} metric="liquidity" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-5 hover:border-purple-500/40 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl">⭐</div>
              <h3 className="text-lg font-semibold text-purple-400">Наблюдение</h3>
            </div>
            <Link href="/watchlist" className="text-xs text-purple-400 hover:text-purple-300">все</Link>
          </div>
          {authLoading ? (
            <Skeleton className="h-24" />
          ) : !isAuthenticated ? (
            <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl" />
                <div className="relative bg-[#0d1626] border border-purple-500/30 rounded-full p-3">
                  <div className="text-xl">🔒</div>
                </div>
              </div>
              <div className="text-sm font-medium text-white mb-1">Требуется авторизация</div>
              <div className="text-xs text-muted-foreground mb-3">Войди для доступа к списку наблюдения</div>
              <Link 
                href="/auth" 
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 transition-all hover:scale-105 text-xs font-medium"
              >
                <span>Войти</span>
              </Link>
            </div>
          ) : watch.length === 0 ? (
            <EmptyState title="Список пуст" hint="Добавляй артефакты звёздочкой из ленты или каталога." />
          ) : (
            <ul className="space-y-1.5">
              {watch.slice(0, 5).map((row) => (
                <li key={row.itemId}>
                  <Link
                    href={`/item/${row.itemId}?quality=${encodeURIComponent(row.item?.quality || '')}&upgrade_level=${row.item?.upgradeLevel || 0}`}
                    className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5 transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.item?.icon ?? ""} alt="" className="h-6 w-6" />
                    <div className="flex flex-col">
                      <span className="truncate text-sm" style={{ color: row.item?.quality ? qualityColor(row.item.quality) : undefined }}>{row.item?.name ?? row.itemId}</span>
                      {row.item?.quality && (
                        <span className="text-xs text-muted">{row.item.quality}{row.item.upgradeLevel > 0 ? ` +${row.item.upgradeLevel}` : ""}</span>
                      )}
                    </div>
                    <span className="ml-auto num text-xs text-muted">
                      {money(row.item?.marketPrice ?? 0)}
                    </span>
                    <Delta value={row.item?.change24h ?? 0} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </motion.div>

      {/* Категории и события - новый дизайн */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="grid gap-4 lg:grid-cols-2"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d1626] to-[#0f1826] p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="text-2xl">📊</div>
            <h3 className="text-lg font-semibold">Категории рынка</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {(summary?.heatmap ?? []).map((cell, index) => {
              const positive = cell.change24h >= 0;
              const intensity = Math.min(1, Math.abs(cell.change24h) / 12);
              return (
                <motion.div
                  key={cell.category}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="rounded-xl border border-white/5 p-4 hover:border-white/10 hover:scale-105 transition-all cursor-pointer"
                  style={{
                    background: positive
                      ? `rgba(0,194,122,${0.08 + intensity * 0.25})`
                      : `rgba(255,91,110,${0.08 + intensity * 0.25})`,
                  }}
                >
                  <div className="text-sm font-medium">{categoryName(cell.category)}</div>
                  <div className="num mt-2 text-xl font-bold">
                    {cell.change24h > 0 ? "+" : ""}
                    {cell.change24h.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted mt-1">
                    {cell.items} шт. · {num(cell.liquidity)}/д
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d1626] to-[#0f1826] p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="text-2xl">📅</div>
            <h3 className="text-lg font-semibold">Календарь событий</h3>
          </div>
          {summary?.events?.length ? (
            <ul className="max-h-64 space-y-2 overflow-auto">
              {summary.events.map((event, index) => (
                <motion.li 
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/5 transition-all"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      event.type.includes("drop") ? "bg-danger" : "bg-success"
                    }`}
                  />
                  <Link href={`/item/${event.itemId}`} className="text-sm font-medium" style={{ color: qualityColor(event.quality) }}>
                    {event.name}
                  </Link>
                  <span className="text-xs text-muted">{event.message}</span>
                  <span className="ml-auto text-xs text-muted">{timeAgo(event.happenedAt)}</span>
                </motion.li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Событий пока нет"
              hint="Аномалии появятся, когда накопится история и цены начнут заметно двигаться."
            />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
