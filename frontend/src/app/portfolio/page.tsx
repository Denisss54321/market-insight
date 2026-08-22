"use client";

import { Trash2, Search, Plus, Crown, Shield, Calendar, Trophy, Flame, Settings, User, TrendingUp, Sparkles, Leaf, Star, Heart, Zap, Award, Gem, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { motion } from "framer-motion";

import { Badge, Card, EmptyState, KpiCard, Skeleton } from "@/components/ui";
import AuthRequired from "@/components/AuthRequired";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { Deal, ItemRow, Portfolio, api } from "@/lib/api";
import { money, num, timeAgo, qualityColor } from "@/lib/format";

const QUALITIES = ["Обычный", "Необычный", "Особый", "Редкий", "Исключительный", "Легендарный"];
const UPGRADE_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export default function PortfolioPage() {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [search, setSearch] = useState("");
  const [filteredItems, setFilteredItems] = useState<ItemRow[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemRow | null>(null);
  const [selectedQuality, setSelectedQuality] = useState("");
  const [selectedUpgrade, setSelectedUpgrade] = useState(0);
  const [buyPrice, setBuyPrice] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLDivElement>(null);
  const upgradeRef = useRef<HTMLSpanElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  
  // Данные пользователя
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toasts, removeToast, success, error } = useToast();
  
  // Предыдущие значения для пульсации
  const [prevPortfolio, setPrevPortfolio] = useState<Portfolio | null>(null);

  useEffect(() => {
    setMounted(true);
    
    const handleResize = () => {
      if (search && searchInputRef.current) {
        const rect = searchInputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [search]);

  useEffect(() => {
    if (selectedUpgrade > 0 && upgradeRef.current) {
      // Reset animation
      upgradeRef.current.style.animation = 'none';
      // Force reflow
      void upgradeRef.current.offsetHeight;
      // Apply animation
      upgradeRef.current.style.animation = 'upgradeSlideIn 0.4s ease-out';
    }
  }, [selectedUpgrade]);

  const load = useCallback(() => {
    api<Portfolio>("/api/deals").then((data) => {
      setPortfolio((prev) => {
        setPrevPortfolio(prev);
        return data;
      });
    }).catch(() => setPortfolio({ deals: [], invested: 0, realizedProfit: 0, unrealizedProfit: 0, openCount: 0, closedCount: 0, winRate: 0, bestDeal: null, worstDeal: null }));
  }, []); // <-- пустой массив, load теперь стабильная ссылка

  const loadUserData = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    
    // Сначала загружаем из кэша
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
    if (isAuthenticated) {
      load();
      const timer = setInterval(load, 30000); // Увеличили интервал до 30 секунд
      return () => clearInterval(timer);
    }
    api<{ items: ItemRow[] }>("/api/catalog?limit=200&sort=liquidity")
      .then((data) => setItems(data.items))
      .catch(() => undefined);
  }, [load, isAuthenticated]);

  // Загрузка данных пользователя только один раз при монтировании
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
        icon: <Shield size={16} className="text-green-400" />,
        title: "Сталкер"
      },
      3: {
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        gradient: "from-blue-500 to-cyan-500",
        hexColor: "#60a5fa",
        icon: <TrendingUp size={16} className="text-blue-400" />,
        title: "Искатель"
      },
      4: {
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/20",
        gradient: "from-purple-500 to-violet-500",
        hexColor: "#c084fc",
        icon: <Star size={16} className="text-purple-400" />,
        title: "Следопыт"
      },
      5: {
        color: "text-pink-400",
        bgColor: "bg-pink-500/10",
        borderColor: "border-pink-500/20",
        gradient: "from-pink-500 to-rose-500",
        hexColor: "#f472b6",
        icon: <Heart size={16} className="text-pink-400" />,
        title: "Охотник"
      },
      6: {
        color: "text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/20",
        gradient: "from-orange-500 to-amber-500",
        hexColor: "#fb923c",
        icon: <Flame size={16} className="text-orange-400" />,
        title: "Ветеран"
      },
      7: {
        color: "text-red-400",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
        gradient: "from-red-500 to-orange-500",
        hexColor: "#f87171",
        icon: <Zap size={16} className="text-red-400" />,
        title: "Скупщик"
      },
      8: {
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/20",
        gradient: "from-yellow-500 to-amber-500",
        hexColor: "#facc15",
        icon: <Crown size={16} className="text-yellow-400" />,
        title: "Торговец"
      },
      9: {
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        gradient: "from-emerald-500 to-teal-500",
        hexColor: "#34d399",
        icon: <Award size={16} className="text-emerald-400" />,
        title: "Барон"
      },
      10: {
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
        gradient: "from-amber-500 via-yellow-500 to-amber-400",
        hexColor: "#fbbf24",
        icon: <Gem size={16} className="text-amber-400" />,
        title: "Хозяин Зоны"
      }
    };
    return styles[level as keyof typeof styles] || styles[1];
  };

  const levelStyles = user ? getLevelStyles(user.level) : getLevelStyles(1);
  
  // Состояние для анимации прогресс-бара
  const [prevXp, setPrevXp] = useState(0);
  const [xpChanged, setXpChanged] = useState(false);
  const [userChanged, setUserChanged] = useState(false);
  
  useEffect(() => {
    if (user && user.xp !== prevXp) {
      setXpChanged(true);
      setPrevXp(user.xp);
      setTimeout(() => setXpChanged(false), 1000);
    }
  }, [user?.xp, prevXp]);

  useEffect(() => {
    if (user) {
      setUserChanged(true);
      setTimeout(() => setUserChanged(false), 500);
    }
  }, [user]);

  useEffect(() => {
    if (search) {
      const filtered = items.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.nameEn?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredItems(filtered);
      
      if (searchInputRef.current && mounted) {
        const rect = searchInputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    } else {
      setFilteredItems([]);
      setDropdownPosition(null);
    }
  }, [search, items, mounted]);

  const createDeal = async () => {
    if (!selectedItem || !buyPrice) return;
    const token = localStorage.getItem('auth_token');
    await api("/api/deals", {
      method: "POST",
      body: JSON.stringify({
        token,
        user: "local",
        itemId: selectedItem.id,
        quality: selectedQuality,
        upgradeLevel: selectedUpgrade,
        buyPrice: Number(buyPrice),
        amount: 1,
      }),
    })
      .then(() => {
        success("Сделка добавлена");
        loadUserData();
      })
      .catch((err) => {
        console.error("Error creating deal:", err);
        error("Не удалось добавить сделку");
      });
    setSelectedItem(null);
    setSelectedQuality("");
    setSelectedUpgrade(0);
    setBuyPrice("");
    setSearch("");
    load();
  };

  const patch = async (deal: Deal, body: Record<string, unknown>) => {
    await api(`/api/deals/${deal.id}`, { method: "PATCH", body: JSON.stringify(body) })
      .then(() => {
        success("Сделка обновлена");
        loadUserData();
      })
      .catch(() => error("Не удалось обновить сделку"));
    load();
  };

  const remove = async (deal: Deal) => {
    await api(`/api/deals/${deal.id}`, { method: "DELETE" })
      .then(() => {
        success("Сделка удалена");
        loadUserData();
      })
      .catch(() => error("Не удалось удалить сделку"));
    load();
  };

  if (userLoading) return <Skeleton className="h-64" />;

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <AuthRequired />
      </div>
    );
  }

  if (!portfolio) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {/* Шапка профиля пользователя */}
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
        className={`relative overflow-hidden rounded-2xl border border-white/10 p-6 shadow-2xl`}
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
              {user!.avatar ? (
                <img 
                  src={user!.avatar} 
                  alt={user!.username} 
                  className="h-20 w-20 rounded-full border-3 border-primary/50 shadow-lg shadow-primary/30 object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-3 border-primary/50 shadow-lg shadow-primary/30">
                  <User size={40} className="text-primary" />
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
                  Портфель, {user!.username}
                </h1>
                <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  {user!.auth_provider === "steam" ? (
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
                  <span className="text-primary font-medium">{portfolio.deals.length} сделок</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all border border-white/10 hover:border-white/20">
              <Settings size={16} />
              <span className="text-sm font-medium">Настройки</span>
            </button>
            <button 
              onClick={() => router.push('/plus')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 text-yellow-500 transition-all border border-yellow-500/30 hover:border-yellow-500/50"
            >
              <Crown size={16} />
              <span className="text-sm font-medium">Insight Plus</span>
            </button>
          </div>
        </div>
      </motion.div >

      {/* Карточка уровня - Простой дизайн под стиль сайта */}
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
        className={`relative rounded-2xl border ${levelStyles.borderColor} overflow-hidden`}
        style={{
          background: `linear-gradient(135deg, ${levelStyles.hexColor}15 0%, rgba(13, 22, 38, 0.8) 50%, ${levelStyles.hexColor}10 100%)`,
          boxShadow: user!.level >= 8 ? `0 0 30px ${levelStyles.hexColor}30` : undefined
        }}
      >
        {/* Фоновый градиент */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/50" />
        </div>

        {/* Декоративные элементы для высоких уровней */}
        {user!.level >= 8 && (
          <div className="absolute inset-0 pointer-events-none">
            <motion.div 
              animate={{
                opacity: [0.1, 0.3, 0.1],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute top-4 right-4 w-20 h-20 rounded-full blur-2xl"
              style={{ backgroundColor: levelStyles.hexColor }}
            />
          </div>
        )}

        <div className="relative p-6">
          {/* Верхняя часть - заголовок и уровень */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
                className={`p-3 rounded-xl ${levelStyles.bgColor} border ${levelStyles.borderColor}`}
                style={{
                  boxShadow: user!.level >= 6 ? `0 0 15px ${levelStyles.hexColor}40` : undefined
                }}
              >
                {levelStyles.icon}
              </motion.div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Уровень трейдера</div>
                <div 
                  className="text-xl font-bold"
                  style={{
                    color: levelStyles.hexColor,
                    textShadow: user!.level >= 8 ? `0 0 20px ${levelStyles.hexColor}60` : undefined
                  }}
                >
                  {levelStyles.title}
                </div>
              </div>
            </div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="text-right"
            >
              <div 
                className="text-4xl font-bold mb-1"
                style={{
                  color: levelStyles.hexColor,
                  textShadow: user!.level >= 6 ? `0 0 15px ${levelStyles.hexColor}50` : undefined
                }}
              >
                {user!.level}
              </div>
              <div className="text-xs text-muted-foreground">Уровень</div>
            </motion.div>
          </div>

          {/* Прогресс-бар */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-muted-foreground">Прогресс до следующего уровня</span>
              <span 
                className="text-sm font-medium"
                style={{ color: levelStyles.hexColor }}
              >
                {user!.xp_progress} / {user!.xp_needed} XP
              </span>
            </div>
            <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ 
                  width: `${(user!.xp_progress / user!.xp_needed) * 100}%`
                }}
                transition={{ 
                  duration: 0.8, 
                  ease: "easeOut"
                }}
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(to right, ${levelStyles.hexColor}, ${levelStyles.hexColor}80)`,
                  boxShadow: user!.level >= 5 ? `0 0 10px ${levelStyles.hexColor}50` : undefined
                }}
              />
            </div>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-3 gap-4">
            <motion.div
              whileHover={{ 
                y: -2,
                backgroundColor: `${levelStyles.hexColor}20`,
                borderColor: levelStyles.hexColor
              }}
              className="p-4 rounded-xl bg-white/5 border border-white/10 transition-all cursor-pointer"
            >
              <div className="text-xs text-muted-foreground mb-2">Всего XP</div>
              <div 
                className="text-lg font-bold"
                style={{ color: levelStyles.hexColor }}
              >
                {user!.xp}
              </div>
            </motion.div>
            <motion.div
              whileHover={{ 
                y: -2,
                backgroundColor: `${levelStyles.hexColor}20`,
                borderColor: levelStyles.hexColor
              }}
              className="p-4 rounded-xl bg-white/5 border border-white/10 transition-all cursor-pointer"
            >
              <div className="text-xs text-muted-foreground mb-2">Сделок</div>
              <div 
                className="text-lg font-bold"
                style={{ color: levelStyles.hexColor }}
              >
                {user!.deals_count}
              </div>
            </motion.div>
            <motion.div
              whileHover={{ 
                y: -2,
                backgroundColor: `${levelStyles.hexColor}20`,
                borderColor: levelStyles.hexColor
              }}
              className="p-4 rounded-xl bg-white/5 border border-white/10 transition-all cursor-pointer"
            >
              <div className="text-xs text-muted-foreground mb-2">Прибыль</div>
              <div 
                className="text-lg font-bold"
                style={{ color: levelStyles.hexColor }}
              >
                {money(user!.total_profit)}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* KPI карточки */}
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
        className="grid grid-cols-2 gap-3 lg:grid-cols-6"
      >
        <KpiCard 
          label="В позициях" 
          value={money(portfolio.invested)} 
          sub={`${portfolio.openCount} открыто`}
          isEmpty={portfolio.openCount === 0}
          previousValue={prevPortfolio?.invested}
          onClick={() => {/* TODO: Открыть детальную статистику */}}
        />
        <KpiCard
          label="Реализованная прибыль"
          value={money(portfolio.realizedProfit)}
          accent={portfolio.realizedProfit >= 0 ? "success" : "danger"}
          sub={`${portfolio.closedCount} закрыто`}
          isEmpty={portfolio.closedCount === 0}
          previousValue={prevPortfolio?.realizedProfit}
          onClick={() => {/* TODO: Открыть детальную статистику */}}
        />
        <KpiCard
          label="Нереализованная"
          value={money(portfolio.unrealizedProfit)}
          accent={portfolio.unrealizedProfit >= 0 ? "success" : "danger"}
          hint="Оценка открытых позиций по текущей рыночной цене за вычетом комиссии."
          isEmpty={portfolio.openCount === 0}
          previousValue={prevPortfolio?.unrealizedProfit}
          onClick={() => {/* TODO: Открыть детальную статистику */}}
        />
        <KpiCard 
          label="Доля прибыльных" 
          value={`${portfolio.winRate.toFixed(0)}%`}
          isEmpty={portfolio.closedCount === 0}
          previousValue={prevPortfolio?.winRate}
          onClick={() => {/* TODO: Открыть детальную статистику */}}
        />
        <KpiCard
          label="Лучшая сделка"
          value={portfolio.bestDeal ? money(portfolio.bestDeal.profit) : "—"}
          sub={portfolio.bestDeal?.name}
          accent="success"
          isEmpty={!portfolio.bestDeal}
          previousValue={prevPortfolio?.bestDeal?.profit}
          onClick={() => {/* TODO: Открыть детальную статистику */}}
        />
        <KpiCard
          label="Худшая сделка"
          value={portfolio.worstDeal ? money(portfolio.worstDeal.profit) : "—"}
          sub={portfolio.worstDeal?.name}
          accent="danger"
          isEmpty={!portfolio.worstDeal}
          previousValue={prevPortfolio?.worstDeal?.profit}
          onClick={() => {/* TODO: Открыть детальную статистику */}}
        />
      </motion.div>

      <Card title="Добавить сделку">
        <div className="space-y-4">
          {/* Поиск артефакта */}
          <div className="relative" ref={searchInputRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted size-4" />
            <input
              className="input pl-10"
              placeholder="Поиск артефакта..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {filteredItems.length > 0 && dropdownPosition && mounted && createPortal(
              <div 
                className="bg-[#101a2b] border border-white/10 rounded-lg overflow-hidden max-h-64 overflow-auto shadow-xl"
                style={{ 
                  position: 'fixed',
                  top: `${dropdownPosition.top}px`, 
                  left: `${dropdownPosition.left}px`, 
                  width: `${dropdownPosition.width}px`,
                  zIndex: 9999,
                  visibility: 'visible'
                }}
              >
                {filteredItems.slice(0, 10).map((item) => (
                  <button
                    key={item.id}
                    className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3"
                    onClick={() => {
                      setSelectedItem(item);
                      setSearch("");
                      setFilteredItems([]);
                      setDropdownPosition(null);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.icon} alt="" className="h-8 w-8" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-muted">
                        {item.minPrice !== null && item.maxPrice !== null && item.minPrice !== item.maxPrice ? (
                          <span>{money(item.minPrice)} — {money(item.maxPrice)}</span>
                        ) : item.marketPrice !== null ? (
                          <span>{money(item.marketPrice)}</span>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>

          {/* Выбранный артефакт */}
          {selectedItem && (
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedItem.icon} alt="" className="h-10 w-10" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div 
                    className="text-sm font-medium transition-all duration-500 ease-out"
                    style={selectedQuality && selectedQuality !== "Обычный" ? {
                      color: qualityColor(selectedQuality),
                      textShadow: `0 0 20px ${qualityColor(selectedQuality)}60, 0 0 40px ${qualityColor(selectedQuality)}30`
                    } : {}}
                  >
                    {selectedItem.name}
                  </div>
                  {selectedUpgrade > 0 && (
                    <span 
                      key={`upgrade-${selectedUpgrade}`}
                      ref={upgradeRef}
                      className="text-sm font-bold"
                      style={{
                        ...selectedQuality && selectedQuality !== "Обычный" ? {
                          color: qualityColor(selectedQuality),
                          textShadow: `0 0 10px ${qualityColor(selectedQuality)}40`
                        } : {
                          color: 'var(--primary)'
                        }
                      }}
                    >
                      +{selectedUpgrade}
                    </span>
                  )}
                  <style jsx global>{`
                    @keyframes upgradeSlideIn {
                      0% {
                        opacity: 0;
                        transform: translateX(20px);
                      }
                      100% {
                        opacity: 1;
                        transform: translateX(0);
                      }
                    }
                    
                    input[type="number"]::-webkit-inner-spin-button,
                    input[type="number"]::-webkit-outer-spin-button {
                      -webkit-appearance: none;
                      margin: 0;
                    }
                    
                    input[type="number"] {
                      -moz-appearance: textfield;
                    }
                  `}</style>
                </div>
                <div className="text-xs text-muted">
                  {selectedItem.minPrice !== null && selectedItem.maxPrice !== null && selectedItem.minPrice !== selectedItem.maxPrice ? (
                    <span>{money(selectedItem.minPrice)} — {money(selectedItem.maxPrice)}</span>
                  ) : selectedItem.marketPrice !== null ? (
                    <span>{money(selectedItem.marketPrice)}</span>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
              <button
                className="btn px-2 py-1"
                onClick={() => setSelectedItem(null)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}

          {/* Выбор качества */}
          {selectedItem && (
            <div>
              <div className="text-xs text-muted mb-2">Качество:</div>
              <div className="flex flex-wrap gap-2">
                {QUALITIES.map((quality) => (
                  <button
                    key={quality}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      selectedQuality === quality
                        ? quality === "Обычный"
                          ? "bg-white/90 text-gray-900 shadow"
                          : "text-white shadow"
                        : "bg-white/5 hover:bg-white/10 text-muted-foreground"
                    )}
                    onClick={() => setSelectedQuality(selectedQuality === quality ? "" : quality)}
                    style={selectedQuality === quality && quality !== "Обычный" ? { backgroundColor: qualityColor(quality), boxShadow: `0 4px 6px -1px ${qualityColor(quality)}40` } : {}}
                  >
                    {quality}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Выбор заточки */}
          {selectedItem && selectedQuality && (
            <div>
              <div className="text-xs text-muted mb-2">Заточка:</div>
              <div className="flex flex-wrap gap-2">
                {UPGRADE_LEVELS.map((upgrade) => (
                  <button
                    key={upgrade}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ease-out",
                      selectedUpgrade === upgrade
                        ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30"
                        : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:scale-105"
                    )}
                    onClick={() => setSelectedUpgrade(selectedUpgrade === upgrade ? 0 : upgrade)}
                  >
                    <span className={clsx(
                      "inline-block transition-all duration-300",
                      selectedUpgrade === upgrade ? "animate-pulse" : ""
                    )}>
                      {upgrade === 0 ? "0" : `+${upgrade}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Параметры сделки */}
          {selectedItem && selectedQuality && (
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Цена покупки"
                type="number"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
              />
              <button
                className="btn-primary flex items-center gap-2"
                onClick={createDeal}
                disabled={!buyPrice}
              >
                <Plus size={16} />
                Добавить
              </button>
            </div>
          )}
        </div>
      </Card>

      <Card title="Сделки">
        {portfolio.deals.length === 0 ? (
          <EmptyState
            title="Сделок пока нет"
            hint="Нажми «+» у выгодного лота в ленте — сделка создастся с ценой лота и текущей рыночной ценой."
          />
        ) : (
          <div className="overflow-auto rounded-xl border border-white/5">
            <table className="w-full">
              <thead className="bg-[#101a2b]">
                <tr>
                  <th className="th">Артефакт</th>
                  <th className="th">Статус</th>
                  <th className="th">Куплено</th>
                  <th className="th">Кол-во</th>
                  <th className="th">Вложено</th>
                  <th className="th">Рынок сейчас</th>
                  <th className="th">Выставлено</th>
                  <th className="th">Продано</th>
                  <th className="th">Прибыль</th>
                  <th className="th">ROI</th>
                  <th className="th">Срок</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody>
                {portfolio.deals.map((deal) => (
                  <tr key={deal.id} className="border-t border-white/5">
                    <td className="td">
                      <Link href={`/item/${deal.itemId}`} className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={deal.icon} alt="" className="h-6 w-6" />
                        {deal.name}
                      </Link>
                    </td>
                    <td className="td">
                      <Badge
                        tone={deal.state === "sold" ? "success" : deal.state === "listed" ? "warning" : "primary"}
                      >
                        {deal.state === "sold" ? "продано" : deal.state === "listed" ? "выставлено" : "куплено"}
                      </Badge>
                    </td>
                    <td className="td num">{money(deal.buyPrice)}</td>
                    <td className="td num">{deal.amount}</td>
                    <td className="td num">{money(deal.invested)}</td>
                    <td className="td num text-muted">{money(deal.marketPriceNow)}</td>
                    <td className="td">
                      <input
                        className="input h-8 w-24"
                        defaultValue={deal.listPrice ?? ""}
                        placeholder="цена"
                        onBlur={(event) =>
                          event.target.value && patch(deal, { listPrice: Number(event.target.value) })
                        }
                      />
                    </td>
                    <td className="td">
                      <input
                        className="input h-8 w-24"
                        defaultValue={deal.sellPrice ?? ""}
                        placeholder="цена"
                        onBlur={(event) =>
                          event.target.value && patch(deal, { sellPrice: Number(event.target.value) })
                        }
                      />
                    </td>
                    <td className={`td num ${deal.profit >= 0 ? "text-success" : "text-danger"}`}>
                      {money(deal.profit)}
                    </td>
                    <td className="td num">{deal.roiPercent.toFixed(1)}%</td>
                    <td className="td text-xs text-muted">
                      {deal.realized ? timeAgo(deal.soldAt) : timeAgo(deal.boughtAt)}
                      {!deal.realized && deal.liquidity > 0 && (
                        <span className="block">
                          ~{num(Math.max(1, 24 / Math.max(deal.liquidity, 0.1)))} ч до продажи
                        </span>
                      )}
                    </td>
                    <td className="td">
                      <button className="btn px-2 py-1" onClick={() => remove(deal)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
