"use client";

import clsx from "clsx";
import { Activity, Backpack, Crown, Gamepad2, Info, LineChart, LogOut, Search, Shield, Star, User, Wallet, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { API_BASE, ItemRow, Status, api } from "@/lib/api";
import { qualityColor, timeAgo } from "@/lib/format";

const NAV = [
  { href: "/", label: "Дашборд", icon: Activity },
  { href: "/catalog", label: "Каталог", icon: Search },
  { href: "/watchlist", label: "Наблюдение", icon: Star },
  { href: "/portfolio", label: "Портфель", icon: Wallet },
  { href: "/builds", label: "Сборки", icon: Backpack },
  { href: "/about", label: "О проекте", icon: Info },
];

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemRow[]>([]);
  const [failed, setFailed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<{ username: string; avatar: string } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Загружаем состояние авторизации при монтировании
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const savedAuth = localStorage.getItem('auth_token');
        if (savedAuth) {
          setIsAuthenticated(true);
          // Загружаем данные пользователя
          const response = await fetch(`${API_BASE}/auth/me?token=${savedAuth}`);
          if (response.ok) {
            const userData = await response.json();
            setUser({ username: userData.username, avatar: userData.avatar });
          }
        }
        
        // Проверяем токен в URL после OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        if (token) {
          localStorage.setItem('auth_token', token);
          setIsAuthenticated(true);
          // Загружаем данные пользователя
          const response = await fetch(`${API_BASE}/auth/me?token=${token}`);
          if (response.ok) {
            const userData = await response.json();
            setUser({ username: userData.username, avatar: userData.avatar });
          }
          // Убираем токен из URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch (error) {
        // Игнорируем ошибки
      }
    };

    loadUserData();
  }, []);

  const handleSteamLogin = () => {
    // Перенаправление на Steam OAuth (без /api префикса)
    window.location.href = `${API_BASE}/auth/steam`;
  };

  const handleExboLogin = () => {
    // Перенаправление на Exbo OAuth (без /api префикса)
    window.location.href = `${API_BASE}/auth/exbo`;
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('auth_token');
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Failed to remove auth token:', error);
    }
  };

  useEffect(() => {
    const load = () =>
      api<Status>("/api/status")
        .then((data) => {
          setStatus(data);
          setFailed(false);
        })
        .catch(() => setFailed(true));
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      api<{ items: ItemRow[] }>(`/api/catalog?search=${encodeURIComponent(query)}&limit=8`)
        .then((data) => setResults(data.items))
        .catch(() => setResults([]));
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  const online = !failed && status !== null;
  const isBuildsPage = pathname === '/builds';

  return (
    <>
      <header className={clsx(
        "sticky top-0 z-40 border-b backdrop-blur-xl",
        isBuildsPage ? "border-[#1A211C] bg-[#0A0D0B]" : "border-[var(--nav-border)] bg-[var(--nav-bg)]/80"
      )}>
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className={clsx(
            "grid h-8 w-8 place-items-center rounded-xl",
            isBuildsPage ? "bg-[#D9A441]/20 text-[#D9A441]" : "bg-[var(--nav-accent)]/20 text-[var(--nav-accent)]"
          )}>
            <Activity size={16} />
          </span>
          <span className={clsx(
            "text-sm font-semibold tracking-tight",
            isBuildsPage ? "text-[#E8ECE8]" : "text-[var(--nav-text)]"
          )}>SZINSIGHT</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition-colors",
                  isBuildsPage ? (
                    active ? "bg-white/10 text-[#E8ECE8]" : "text-[#7A857D] hover:bg-white/5 hover:text-[#E8ECE8]"
                  ) : (
                    active ? "bg-white/10 text-[var(--nav-text)]" : "text-muted hover:bg-white/5 hover:text-[var(--nav-text)]"
                  )
                )}
              >
                <item.icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative ml-auto w-full max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск артефакта…"
            className="input pl-9"
          />
          {results.length > 0 && (
            <div className="absolute mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0d1626] shadow-card">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                    router.push(`/item/${item.id}`);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.icon} alt="" className="h-6 w-6" />
                  <span>{item.name}</span>
                  <span className="ml-auto text-xs text-muted">{item.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <span className="chip flex items-center gap-1.5">
            <span
              className={clsx(
                "h-1.5 w-1.5 rounded-full",
                online ? "bg-success" : "bg-danger",
              )}
            />
            {online ? status?.source?.toUpperCase() : "OFFLINE"}
          </span>
          <span className="chip">
            Синхр.: {status ? timeAgo(status.last_scan_at) : "—"}
          </span>
          {isAuthenticated && user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="chip flex items-center gap-2 hover:bg-white/10 transition-colors"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="h-5 w-5 rounded-full" />
                ) : (
                  <User size={14} />
                )}
                <span className="max-w-24 truncate">{user.username}</span>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#0d1626] shadow-card z-50">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      router.push('/plus');
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors group"
                  >
                    <Crown size={16} className="text-yellow-500 group-hover:scale-110 transition-transform" />
                    <span className="font-medium" style={{ color: qualityColor('Легендарный') }}>Insight Plus</span>
                  </button>
                  <div className="h-px bg-white/10" />
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors group"
                  >
                    <LogOut size={16} className="text-red-500 group-hover:scale-110 transition-transform" />
                    <span className="font-medium" style={{ color: qualityColor('Исключительный') }}>Выйти</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="chip flex items-center gap-1.5 hover:bg-white/10 transition-colors"
              title="Войти"
            >
              <Shield size={12} />
              Войти
            </button>
          )}
        </div>
      </div>
      {failed && (
        <div className="bg-danger/15 px-4 py-1.5 text-center text-xs text-danger">
          Бэкенд не отвечает по адресу {API_BASE}. Запусти его командой uvicorn app.main:app
        </div>
      )}
    </header>
    {showAuthModal && (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
        <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0d1626] p-6 shadow-card relative z-[10001]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Авторизация</h3>
            <button
              onClick={() => setShowAuthModal(false)}
              className="text-muted hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-sm text-muted mb-6 leading-relaxed">
            Войдите для доступа к аналитике, ленте предложений, портфелю и истории цен.
          </p>
          <div className="space-y-3">
            <button
              onClick={handleSteamLogin}
              className="w-full py-3 px-4 rounded-xl text-sm font-medium transition-all bg-[#171a21] hover:bg-[#1b2838] text-white border border-white/10 hover:border-white/20 flex items-center justify-center gap-3 group"
            >
              <Gamepad2 size={18} className="group-hover:scale-110 transition-transform" />
              <span>Войти через Steam</span>
            </button>
            <button
              onClick={handleExboLogin}
              className="w-full py-3 px-4 rounded-xl text-sm font-medium transition-all bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white border border-white/10 hover:border-white/20 flex items-center justify-center gap-3 group shadow-lg shadow-primary/20"
            >
              <Shield size={18} className="group-hover:scale-110 transition-transform" />
              <span>Войти через Exbo</span>
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
