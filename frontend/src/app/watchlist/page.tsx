"use client";

import { Trash2, Crown, Shield, Settings, Eye, TrendingUp, ArrowUpDown, Search, Sparkles, Bell, Zap, Flame, Star, Leaf, Heart, Award, Gem } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";

import { Card, ConfidenceBar, Delta, EmptyState, Skeleton, Badge } from "@/components/ui";
import AuthRequired from "@/components/AuthRequired";
import { ChartPoint } from "@/components/PriceChart";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { ItemRow, api } from "@/lib/api";
import { categoryName, money, num, qualityColor, timeAgo } from "@/lib/format";

const MiniChart = dynamic(() => import("@/components/PriceChart").then(m => m.MiniChart), { ssr: false });

type WatchRow = { id: number; itemId: string; quality: string; upgradeLevel: number; folder: string; color: string; item: ItemRow | null };
type History = { points: ChartPoint[] };

type SortOption = 'name' | 'price' | 'change' | 'liquidity' | 'confidence';

export default function WatchlistPage() {
  const [rows, setRows] = useState<WatchRow[] | null>(null);
  const [histories, setHistories] = useState<Record<number, ChartPoint[]>>({});
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ 
    username: string; 
    avatar: string; 
    auth_provider: string;
    xp: number;
    level: number;
    xp_progress: number;
    xp_needed: number;
    deals_count: number;
    total_profit: number;
  } | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toasts, removeToast, success, error } = useToast();

  const loadUserData = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    
    const cachedUser = localStorage.getItem('cached_user');
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
        setUserLoading(false);
      } catch (e) {
        // Игнорируем ошибки парсинга
      }
    }
    
    if (token) {
      setUserLoading(true);
      fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8002'}/auth/me?token=${token}`)
        .then(res => res.json())
        .then(data => {
          setUser(data);
          localStorage.setItem('cached_user', JSON.stringify(data));
          setUserLoading(false);
          setIsAuthenticated(true);
        })
        .catch(() => {
          setUser(null);
          setUserLoading(false);
          setIsAuthenticated(false);
        });
    } else {
      setUser(null);
      setUserLoading(false);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, []);

  // Получение визуальных свойств для уровня
  const getLevelStyles = (level: number) => {
    const styles = {
      1: {
        color: "text-gray-400",
        bgColor: "bg-gray-500/10",
        borderColor: "border-gray-500/20",
        gradient: "from-gray-500 to-gray-600",
        hexColor: "#9ca3af",
        icon: <Sparkles size={16} className="text-gray-400" />,
        title: "Новичок"
      },
      2: {
        color: "text-green-400",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/20",
        gradient: "from-green-500 to-emerald-500",
        hexColor: "#4ade80",
        icon: <Leaf size={16} className="text-green-400" />,
        title: "Начинающий"
      },
      3: {
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        gradient: "from-blue-500 to-cyan-500",
        hexColor: "#60a5fa",
        icon: <TrendingUp size={16} className="text-blue-400" />,
        title: "Опытный"
      },
      4: {
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/20",
        gradient: "from-purple-500 to-violet-500",
        hexColor: "#c084fc",
        icon: <Star size={16} className="text-purple-400" />,
        title: "Продвинутый"
      },
      5: {
        color: "text-pink-400",
        bgColor: "bg-pink-500/10",
        borderColor: "border-pink-500/20",
        gradient: "from-pink-500 to-rose-500",
        hexColor: "#f472b6",
        icon: <Heart size={16} className="text-pink-400" />,
        title: "Мастер"
      },
      6: {
        color: "text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/20",
        gradient: "from-orange-500 to-amber-500",
        hexColor: "#fb923c",
        icon: <Flame size={16} className="text-orange-400" />,
        title: "Эксперт"
      },
      7: {
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
        gradient: "from-red-500 to-orange-500",
        hexColor: "#f87171",
        icon: <Zap size={16} className="text-red-400" />,
        title: "Виртуоз"
      },
      8: {
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/20",
        gradient: "from-yellow-500 to-amber-500",
        hexColor: "#facc15",
        icon: <Crown size={16} className="text-yellow-400" />,
        title: "Легенда"
      },
      9: {
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        gradient: "from-emerald-500 to-teal-500",
        hexColor: "#34d399",
        icon: <Award size={16} className="text-emerald-400" />,
        title: "Грандмастер"
      },
      10: {
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
        gradient: "from-amber-500 via-yellow-500 to-amber-400",
        hexColor: "#fbbf24",
        icon: <Gem size={16} className="text-amber-400" />,
        title: "Бог рынка"
      }
    };
    return styles[level as keyof typeof styles] || styles[1];
  };

  const levelStyles = user ? getLevelStyles(user.level) : getLevelStyles(1);
  
  // Состояние для анимации обновления
  const [userChanged, setUserChanged] = useState(false);
  
  useEffect(() => {
    if (user) {
      setUserChanged(true);
      setTimeout(() => setUserChanged(false), 500);
    }
  }, [user]);

  const load = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    
    api<WatchRow[]>(`/api/watchlist?token=${token}`).then(setRows).catch(() => setRows([]));
  }, []);

  const loadHistory = useCallback(async (row: WatchRow) => {
    const queryParams = new URLSearchParams({ days: "7", mode: "price" });
    if (row.quality) queryParams.set("quality", row.quality);
    if (row.upgradeLevel > 0) queryParams.set("upgrade_level", String(row.upgradeLevel));
    
    try {
      const history = await api<History>(`/api/items/${row.itemId}/history?${queryParams.toString()}`);
      setHistories(prev => ({ ...prev, [row.id]: history.points }));
    } catch (error) {
      console.error(`Failed to load history for ${row.itemId}:`, error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      load();
      const timer = setInterval(load, 30000); // Увеличили интервал до 30 секунд
      return () => clearInterval(timer);
    }
  }, [load, isAuthenticated]);

  useEffect(() => {
    if (rows && rows.length > 0) {
      // Загружаем историю только для видимых элементов и с задержкой
      const timeoutId = setTimeout(() => {
        rows.slice(0, 12).forEach(row => loadHistory(row)); // Загружаем первые 12
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [rows, loadHistory]);

  // Фильтрация и сортировка
  const filteredAndSortedRows = useMemo(() => {
    if (!rows) return [];
    
    let filtered = rows.filter(row => {
      const searchTerm = searchQuery.toLowerCase();
      const name = row.item?.name ?? row.itemId;
      const category = categoryName(row.item?.category ?? "");
      return name.toLowerCase().includes(searchTerm) || 
             category.toLowerCase().includes(searchTerm) ||
             row.quality.toLowerCase().includes(searchTerm);
    });
    
    const sorted = [...filtered].sort((a, b) => {
      const aItem = a.item;
      const bItem = b.item;
      
      switch (sortBy) {
        case 'name':
          return sortOrder === 'asc' 
            ? (aItem?.name ?? a.itemId).localeCompare(bItem?.name ?? b.itemId)
            : (bItem?.name ?? b.itemId).localeCompare(aItem?.name ?? a.itemId);
        case 'price':
          return sortOrder === 'asc'
            ? (aItem?.marketPrice ?? 0) - (bItem?.marketPrice ?? 0)
            : (bItem?.marketPrice ?? 0) - (aItem?.marketPrice ?? 0);
        case 'change':
          return sortOrder === 'asc'
            ? (aItem?.change24h ?? 0) - (bItem?.change24h ?? 0)
            : (bItem?.change24h ?? 0) - (aItem?.change24h ?? 0);
        case 'liquidity':
          return sortOrder === 'asc'
            ? (aItem?.liquidity ?? 0) - (bItem?.liquidity ?? 0)
            : (bItem?.liquidity ?? 0) - (aItem?.liquidity ?? 0);
        case 'confidence':
          return sortOrder === 'asc'
            ? (aItem?.confidence ?? 0) - (bItem?.confidence ?? 0)
            : (bItem?.confidence ?? 0) - (aItem?.confidence ?? 0);
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [rows, searchQuery, sortBy, sortOrder]);

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortOrder('desc');
    }
  };

  if (userLoading) return <Skeleton className="h-64" />;

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <AuthRequired />
      </div>
    );
  }

  if (!rows) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {/* Шапка профиля пользователя */}
      {user && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            scale: userChanged ? [1, 1.02, 1] : 1
          }}
          transition={{
            duration: 0.5,
            scale: { duration: 0.3 }
          }}
          className="relative overflow-hidden rounded-2xl border border-white/10 p-6 shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${levelStyles.hexColor}33 0%, #0d1626 30%, ${levelStyles.hexColor}22 100%)`
          }}
        >
          {/* Декоративные элементы */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />
          
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-5">
              <div className="relative">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.username} 
                    className="h-20 w-20 rounded-full border-3 border-primary/50 shadow-lg shadow-primary/30 object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-3 border-primary/50 shadow-lg shadow-primary/30">
                    <Eye size={40} className="text-primary" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-success border-2 border-[#0d1626] flex items-center justify-center">
                  <Sparkles size={12} className="text-white" />
                </div>
              </div>
              <div>
                <h1 
                  className="text-3xl font-bold mb-2"
                  style={{
                    background: `linear-gradient(to right, ${levelStyles.hexColor}, white)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  Список наблюдения, {user.username}
                </h1>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    {user.auth_provider === "steam" ? (
                      <>
                        <Shield size={14} className="text-blue-400" />
                        <span className="text-muted-foreground">Steam</span>
                      </>
                    ) : (
                      <>
                        <Shield size={14} className="text-green-400" />
                        <span className="text-muted-foreground">Exbo</span>
                      </>
                    )}
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${levelStyles.bgColor} border ${levelStyles.borderColor} relative overflow-hidden`}>
                    {user!.level === 10 && (
                      <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        animate={{
                          x: ['-100%', '100%']
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      {levelStyles.icon}
                      <span className={`${levelStyles.color} font-medium`}>Уровень {user!.level}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                    <TrendingUp size={14} className="text-primary" />
                    <span className="text-primary font-medium">{rows.length} артефактов</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all border border-white/10 hover:border-white/20">
                <Settings size={16} />
                <span className="text-sm font-medium">Настройки</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 text-yellow-500 transition-all border border-yellow-500/30 hover:border-yellow-500/50">
                <Crown size={16} />
                <span className="text-sm font-medium">Insight Plus</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Панель управления */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          scale: userChanged ? [1, 1.02, 1] : 1
        }}
        transition={{
          duration: 0.5,
          scale: { duration: 0.3 }
        }}
        className="rounded-2xl border border-white/10 bg-[#101a2b] p-4 shadow-xl"
      >
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Поиск */}
          <div className="relative flex-1 w-full lg:w-auto">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по названию, категории или качеству..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Сортировка */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
              {[
                { key: 'price' as SortOption, label: 'Цена', icon: Zap },
                { key: 'change' as SortOption, label: 'Изменение', icon: Flame },
                { key: 'liquidity' as SortOption, label: 'Ликвидность', icon: Bell },
                { key: 'confidence' as SortOption, label: 'Доверие', icon: Star },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => handleSort(key)}
                  className={clsx(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    sortBy === key 
                      ? "bg-primary text-white shadow-lg shadow-primary/30" 
                      : "text-muted-foreground hover:text-white hover:bg-white/10"
                  )}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                  {sortBy === key && (
                    <ArrowUpDown size={12} className={clsx(sortOrder === 'asc' ? 'rotate-180' : '')} />
                  )}
                </button>
              ))}
            </div>

          </div>
        </div>
      </motion.div>

      {/* Список наблюдения */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          scale: userChanged ? [1, 1.01, 1] : 1
        }}
        transition={{
          duration: 0.5,
          scale: { duration: 0.3 }
        }}
      >
        <Card title="" className="border-0 shadow-none bg-transparent">
          {filteredAndSortedRows.length === 0 ? (
            <EmptyState
              title={searchQuery ? "Ничего не найдено" : "Пока пусто"}
              hint={searchQuery ? "Попробуйте изменить параметры поиска или фильтры" : "Добавляй артефакты звёздочкой из живой ленты или каталога — здесь будут их цены и динамика."}
            />
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div 
                layout
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              >
              {filteredAndSortedRows.map((row, index) => (
                <motion.div
                  key={row.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8, y: 30, filter: "blur(10px)" }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.8, y: -30, filter: "blur(10px)" }}
                  transition={{ duration: 0.5, delay: index * 0.04, type: "spring", stiffness: 300, damping: 25 }}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 p-5"
                >
                  {/* Декоративные градиенты */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* График как фон */}
                  <div className="absolute inset-0 transition-opacity group-hover:opacity-40 overflow-hidden h-[60%] opacity-15">
                    <MiniChart points={histories[row.id] ?? []} />
                  </div>
                  
                  {/* Контент */}
                  <div className="relative z-10 w-full">
                    <div className="flex items-start gap-4">
                      {/* Иконка */}
                      <div className="relative flex-shrink-0">
                        <div className="relative rounded-xl overflow-hidden h-14 w-14">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={row.item?.icon ?? ""} 
                            alt="" 
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </div>
                        {row.quality && (
                          <div 
                            className="absolute -top-2 -right-2 h-5 w-5 rounded-full border-2 border-[#0d1626] shadow-lg"
                            style={{ backgroundColor: qualityColor(row.quality) }}
                          />
                        )}
                      </div>

                      {/* Информация */}
                      <div className="flex-1 min-w-0">
                        <Link 
                          href={`/item/${row.itemId}?quality=${encodeURIComponent(row.quality)}&upgrade_level=${row.upgradeLevel}`}
                          className="font-bold hover:text-primary transition-colors tracking-tight text-base"
                          style={{ 
                            color: row.quality ? qualityColor(row.quality) : undefined,
                          }}
                        >
                          {row.item?.name ?? row.itemId}
                          {(row.upgradeLevel ?? 0) > 0 && (
                            <span className="ml-2 text-sm font-semibold bg-white/10 px-2 py-0.5 rounded-full">+{row.upgradeLevel}</span>
                          )}
                        </Link>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className="text-sm text-muted-foreground font-medium">
                            {categoryName(row.item?.category ?? "")}
                          </span>
                          {row.quality && (
                            <span 
                              className="text-xs font-bold px-3 py-1 rounded-full border shadow-sm"
                              style={{ 
                                backgroundColor: `${qualityColor(row.quality)}25`,
                                color: qualityColor(row.quality),
                                borderColor: `${qualityColor(row.quality)}50`
                              }}
                            >
                              {row.quality}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Кнопка удаления */}
                      <button
                        className="flex-shrink-0 p-3 rounded-xl transition-all text-muted-foreground hover:text-danger hover:bg-danger/10 hover:shadow-lg hover:shadow-danger/10"
                        onClick={() => {
                          setDeletingId(row.id);
                          const token = localStorage.getItem('auth_token');
                          const params = new URLSearchParams();
                          if (row.quality) params.set("quality", row.quality);
                          if (row.upgradeLevel > 0) params.set("upgrade_level", String(row.upgradeLevel));
                          params.set("token", token || "");
                          api(`/api/watchlist/${row.itemId}?${params.toString()}`, { method: "DELETE" })
                            .then(() => {
                              setDeletingId(null);
                              success("Удалено из наблюдения");
                              load();
                            })
                            .catch(() => {
                              setDeletingId(null);
                              error("Не удалось удалить");
                            });
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Статистика */}
                    <div className="mt-5 flex items-center gap-6 justify-between">
                      <div className="relative">
                        <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">Рыночная цена</div>
                        <div className="font-bold tracking-tight text-lg">
                          {money(row.item?.marketPrice ?? 0)}
                        </div>
                      </div>
                      <Delta value={row.item?.change24h ?? 0} />
                    </div>

                    {/* Метрики */}
                    <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground justify-between">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
                        <Bell size={14} className="text-primary" />
                        <span className="font-medium">{num(row.item?.liquidity ?? 0)}/д</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
                        <ConfidenceBar value={row.item?.confidence ?? 0} />
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
                        <span className="font-medium">{timeAgo(row.item?.updatedAt ?? null)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </Card>
      </motion.div>
    </div>
  );
}
