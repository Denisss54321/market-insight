"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, Pause, Play, Plus, Star, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge, Card, ConfidenceBar, EmptyState } from "@/components/ui";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { API_BASE, FeedLot, api } from "@/lib/api";
import { liquidity, money, qualityColor, timeLeft } from "@/lib/format";

const QUALITY_ORDER = ["Обычный", "Необычный", "Особый", "Редкий", "Исключительный", "Легендарный"];

type Filters = {
  minProfit: number;
  minRoi: number;
  minLiquidity: number;
  minConfidence: number;
  search: string;
  qualities: string[];
  upgradeLevels: number[];
};

const DEFAULT_FILTERS: Filters = {
  minProfit: 0,
  minRoi: 0,
  minLiquidity: 0,
  minConfidence: 0,
  search: "",
  qualities: [],
  upgradeLevels: [],
};

const loadFiltersFromStorage = (): Filters => {
  if (typeof window === 'undefined') return DEFAULT_FILTERS;
  try {
    const saved = localStorage.getItem('livefeed_filters');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load filters from localStorage:', error);
  }
  return DEFAULT_FILTERS;
};


interface LiveFeedProps {
  onWatchlistChange?: () => void;
}

export default function LiveFeed({ onWatchlistChange }: LiveFeedProps) {
  const [lots, setLots] = useState<FeedLot[]>([]);
  const [paused, setPaused] = useState(false);
  const [connected, setConnected] = useState(false);
  const [filters, setFilters] = useState<Filters>(loadFiltersFromStorage);
  const [flash, setFlash] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const buffer = useRef<FeedLot[]>([]);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const { success, error, toasts, removeToast } = useToast();

  // Загружаем состояние звука из localStorage после монтирования
  useEffect(() => {
    try {
      const saved = localStorage.getItem('livefeed_sound');
      if (saved === 'true') {
        setSoundEnabled(true);
      }
    } catch (error) {
      // Игнорируем ошибки
    }
  }, []);

  // Сохраняем фильтры в localStorage при их изменении
  useEffect(() => {
    try {
      localStorage.setItem('livefeed_filters', JSON.stringify(filters));
    } catch {
      console.error('Failed to save filters to localStorage');
    }
  }, [filters]);

  // Сохраняем состояние звука в localStorage
  useEffect(() => {
    try {
      localStorage.setItem('livefeed_sound', String(soundEnabled));
    } catch {
      console.error('Failed to save sound setting to localStorage');
    }
  }, [soundEnabled]);

  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch {
      // Игнорируем ошибки воспроизведения
    }
  }, []);

  const push = useCallback((incoming: FeedLot[]) => {
    if (pausedRef.current) {
      buffer.current = [...incoming, ...buffer.current].slice(0, 200);
      return;
    }
    setLots((current) => {
      const keys = new Set(current.map((lot) => `${lot.itemId}:${lot.lotKey}`));
      const fresh = incoming.filter((lot) => !keys.has(`${lot.itemId}:${lot.lotKey}`));
      if (fresh.length) {
        setFlash(fresh.map((lot) => `${lot.itemId}:${lot.lotKey}`));
        setTimeout(() => setFlash([]), 1200);
        
        // Воспроизводим звук для новых лотов, которые проходят фильтры
        if (soundEnabled) {
          const filteredFresh = fresh.filter(
            (lot) =>
              lot.profit >= filters.minProfit &&
              lot.roi >= filters.minRoi &&
              lot.liquidity >= filters.minLiquidity &&
              lot.confidence >= filters.minConfidence &&
              (!filters.search ||
                lot.name.toLowerCase().includes(filters.search.toLowerCase())) &&
              (filters.qualities.length === 0 || filters.qualities.includes(lot.quality)) &&
              (filters.upgradeLevels.length === 0 || filters.upgradeLevels.includes(lot.upgradeLevel))
          );
          if (filteredFresh.length > 0) {
            playNotificationSound();
          }
        }
      }
      return [...fresh, ...current].slice(0, 150);
    });
  }, [soundEnabled, filters, playNotificationSound]);

  const pushRef = useRef(push);
  pushRef.current = push;

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;
      const url = `${API_BASE.replace(/^http/, "ws")}/api/ws/lots`;
      socket = new WebSocket(url);
      socket.onopen = () => setConnected(true);
      socket.onclose = (event) => {
        setConnected(false);
        console.log('WebSocket closed:', event.code, event.reason);
        if (isMounted) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      };
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as { type: string; items: FeedLot[]; lotKeys: string[] };
        if (message.type === "lots") pushRef.current(message.items);
        if (message.type === "snapshot" && message.items.length) pushRef.current(message.items);
        if (message.type === "lot_removed" && message.lotKeys) {
          setLots((current) => current.filter((lot) => !message.lotKeys.includes(lot.lotKey)));
        }
      };
    };

    api<{ items: FeedLot[] }>("/api/feed?limit=60")
      .then((data) => setLots(data.items))
      .catch(() => undefined);

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
  }, []); // пустой массив зависимостей — соединение больше не пересоздаётся при изменении soundEnabled/filters

  useEffect(() => {
    if (!paused && buffer.current.length) {
      push(buffer.current);
      buffer.current = [];
    }
  }, [paused, push]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space" && !(event.target as HTMLElement).closest("input")) {
        event.preventDefault();
        setPaused((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visible = useMemo(
    () =>
      lots.filter(
        (lot) =>
          lot.profit >= filters.minProfit &&
          lot.roi >= filters.minRoi &&
          lot.liquidity >= filters.minLiquidity &&
          lot.confidence >= filters.minConfidence &&
          (!filters.search ||
            lot.name.toLowerCase().includes(filters.search.toLowerCase())) &&
          (filters.qualities.length === 0 || filters.qualities.includes(lot.quality)) &&
          (filters.upgradeLevels.length === 0 || filters.upgradeLevels.includes(lot.upgradeLevel)),
      ),
    [lots, filters],
  );

  const addDeal = async (lot: FeedLot) => {
    try {
      const token = localStorage.getItem('auth_token');
      await api("/api/deals", {
        method: "POST",
        body: JSON.stringify({ 
          token,
          user: "local",
          itemId: lot.itemId, 
          buyPrice: lot.price, 
          amount: 1, 
          quality: lot.quality, 
          upgradeLevel: lot.upgradeLevel 
        }),
      });
      success("Сделка добавлена! Переход в портфель...");
      setTimeout(() => {
        window.location.href = "/portfolio";
      }, 1500);
    } catch {
      error("Ошибка при добавлении сделки");
    }
  };

  const addWatch = async (lot: FeedLot) => {
    try {
      const token = localStorage.getItem('auth_token');
      await api("/api/watchlist", {
        method: "POST",
        body: JSON.stringify({ 
          token,
          user: "local",
          itemId: lot.itemId, 
          quality: lot.quality, 
          upgradeLevel: lot.upgradeLevel 
        }),
      });
      success("Добавлено в наблюдение");
      onWatchlistChange?.();
    } catch {
      error("Ошибка при добавлении в наблюдение");
    }
  };

  const copyName = (lot: FeedLot) => {
    const name = lot.name;
    navigator.clipboard.writeText(name).then(() => {
      success("Название сохранено в буфер");
    }).catch(() => {
      error("Ошибка при копировании");
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Заголовок и управление */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">⚡</div>
          <div>
            <h2 className="text-xl font-bold">Живая лента</h2>
            <p className="text-sm text-muted-foreground">Лоты с ценой ниже рыночной</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className={clsx("h-2 w-2 rounded-full", connected ? "bg-success animate-pulse" : "bg-warning")} />
            <span className="text-sm">{connected ? "активен" : "оффлайн"}</span>
          </div>
          <button 
            className={clsx(
              "p-2 rounded-lg transition-all",
              soundEnabled ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground hover:bg-white/10"
            )}
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? "Выключить звук" : "Включить звук"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button 
            className={clsx(
              "p-2 rounded-lg transition-all",
              paused ? "bg-warning/20 text-warning" : "bg-white/5 text-muted-foreground hover:bg-white/10"
            )}
            onClick={() => setPaused((v) => !v)}
            title={paused ? "Продолжить" : "Пауза"}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
        </div>
      </div>

      {/* Фильтры */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            className="input"
            placeholder="Поиск..."
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          />
          <input
            className="input"
            placeholder="Мин. прибыль"
            inputMode="numeric"
            value={filters.minProfit || ""}
            onChange={(event) =>
              setFilters({ ...filters, minProfit: Number(event.target.value) || 0 })
            }
          />
          <input
            className="input"
            placeholder="Мин. ROI %"
            inputMode="numeric"
            value={filters.minRoi || ""}
            onChange={(event) =>
              setFilters({ ...filters, minRoi: Number(event.target.value) || 0 })
            }
          />
          <input
            className="input"
            placeholder="Мин. ликвидность"
            inputMode="numeric"
            value={filters.minLiquidity || ""}
            onChange={(event) =>
              setFilters({ ...filters, minLiquidity: Number(event.target.value) || 0 })
            }
          />
          <input
            className="input"
            placeholder="Мин. доверие"
            inputMode="numeric"
            value={filters.minConfidence || ""}
            onChange={(event) =>
              setFilters({ ...filters, minConfidence: Number(event.target.value) || 0 })
            }
          />
        </div>
        
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Качество:</span>
            <div className="flex gap-1">
              {QUALITY_ORDER.map((quality) => (
                <button
                  key={quality}
                  className={clsx(
                    "px-2 py-1 rounded-lg text-xs font-medium transition-all",
                    filters.qualities.includes(quality)
                      ? quality === "Обычный"
                        ? "bg-white/90 text-gray-900"
                        : "text-white"
                      : "bg-white/5 hover:bg-white/10 text-muted-foreground"
                  )}
                  onClick={() => {
                    const newQualities = filters.qualities.includes(quality)
                      ? filters.qualities.filter(q => q !== quality)
                      : [...filters.qualities, quality];
                    setFilters({ ...filters, qualities: newQualities });
                  }}
                  style={filters.qualities.includes(quality) && quality !== "Обычный" ? { backgroundColor: qualityColor(quality) } : {}}
                >
                  {quality}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Заточка:</span>
            <div className="flex gap-1">
              {Array.from({ length: 16 }, (_, i) => i).map((upgrade) => (
                <button
                  key={upgrade}
                  className={clsx(
                    "px-2 py-1 rounded-lg text-xs font-medium transition-all",
                    filters.upgradeLevels.includes(upgrade)
                      ? "bg-primary text-white"
                      : "bg-white/5 hover:bg-white/10 text-muted-foreground"
                  )}
                  onClick={() => {
                    const newLevels = filters.upgradeLevels.includes(upgrade)
                      ? filters.upgradeLevels.filter(l => l !== upgrade)
                      : [...filters.upgradeLevels, upgrade];
                    setFilters({ ...filters, upgradeLevels: newLevels });
                  }}
                >
                  {upgrade === 0 ? "0" : `+${upgrade}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Лента */}
      <div className="max-h-[480px] overflow-auto space-y-2">
        {visible.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-8 border border-white/10">
            <EmptyState
              title="Пока нет лотов, проходящих фильтры"
              hint="Подожди несколько циклов или ослабь фильтры."
            />
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visible.map((lot) => {
              const key = `${lot.itemId}:${lot.lotKey}`;
              return (
                <motion.div
                  key={key}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={clsx(
                    "bg-white/5 rounded-xl p-3 border border-white/10 hover:border-white/20 transition-all",
                    flash.includes(key) && "border-success/30 bg-success/5"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/item/${lot.itemId}?quality=${encodeURIComponent(lot.quality)}&upgrade_level=${lot.upgradeLevel}`}
                      className="shrink-0"
                    >
                      <img src={lot.icon} alt={lot.name} className="h-12 w-12 rounded-lg" />
                    </Link>
                    
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/item/${lot.itemId}?quality=${encodeURIComponent(lot.quality)}&upgrade_level=${lot.upgradeLevel}`}
                        className="block"
                      >
                        <div className="font-medium truncate" style={{ color: qualityColor(lot.quality) }}>
                          {lot.name}
                          {lot.upgradeLevel > 0 && <span className="ml-1 text-muted">+{lot.upgradeLevel}</span>}
                        </div>
                        <div className="text-xs text-muted">{lot.quality}</div>
                      </Link>
                    </div>

                    <div className="flex items-center gap-6 text-sm shrink-0">
                      <div className="w-20 text-right">
                        <div className="text-xs text-muted">Цена</div>
                        <div className="font-medium num">{money(lot.price)}</div>
                      </div>
                      <div className="w-20 text-right">
                        <div className="text-xs text-muted">Рынок</div>
                        <div className="font-medium num text-muted">{money(lot.marketPrice)}</div>
                      </div>
                      <div className="w-20 text-right">
                        <div className="text-xs text-muted">Прибыль</div>
                        <div className="font-medium num text-success">{money(lot.profit)}</div>
                      </div>
                      <div className="w-16 text-right">
                        <div className="text-xs text-muted">ROI</div>
                        <div className="font-medium">
                          <Badge tone={lot.roi >= 40 ? "success" : "primary"}>{lot.roi.toFixed(1)}%</Badge>
                        </div>
                      </div>
                      <div className="w-20 text-right hidden md:block">
                        <div className="text-xs text-muted">Ликвидность</div>
                        <div className="font-medium num text-muted">{liquidity(lot.liquidity)}/д</div>
                      </div>
                      <div className="w-20 text-right hidden lg:block">
                        <div className="text-xs text-muted">Осталось</div>
                        <div className="font-medium text-muted">{timeLeft(lot.endsAt)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground transition-all"
                        onClick={() => copyName(lot)}
                        title="Копировать"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        className="p-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary transition-all"
                        onClick={() => addDeal(lot)}
                        title="Купить"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground transition-all"
                        onClick={() => addWatch(lot)}
                        title="В наблюдение"
                      >
                        <Star size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </motion.div>
  );
}
