"use client";

import { useEffect, useState } from "react";
import { LogOut, User, Shield, Gamepad2, Calendar, Crown } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { useRouter } from "next/navigation";

interface UserProfile {
  id: number;
  username: string;
  avatar: string;
  auth_provider: string;
  created_at: string;
  last_login: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      window.location.href = "/";
      return;
    }

    fetch(`${API_BASE}/auth/me?token=${token}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch user");
        }
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("auth_token");
        window.location.href = "/";
      });
  }, []);

  const handleLogout = () => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      fetch(`${API_BASE}/auth/logout?token=${token}`, { method: "POST" });
    }
    localStorage.removeItem("auth_token");
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="rounded-xl border border-white/10 bg-[#0d1626] p-8 shadow-card">
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-6">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="w-24 h-24 rounded-full border-2 border-white/10"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                <User size={48} className="text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold mb-2">{user.username}</h1>
              <div className="flex items-center gap-2 text-muted">
                {user.auth_provider === "steam" ? (
                  <>
                    <Gamepad2 size={16} />
                    <span>Steam</span>
                  </>
                ) : (
                  <>
                    <Shield size={16} />
                    <span>Exbo</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors"
          >
            <LogOut size={16} />
            <span>Выйти</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg bg-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar size={20} className="text-primary" />
              <h3 className="font-semibold">Дата регистрации</h3>
            </div>
            <p className="text-muted">{formatDate(user.created_at)}</p>
          </div>

          <div className="rounded-lg bg-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <User size={20} className="text-primary" />
              <h3 className="font-semibold">Последний вход</h3>
            </div>
            <p className="text-muted">{formatDate(user.last_login)}</p>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10">
          <h2 className="text-lg font-semibold mb-4">Доступные функции</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5">
              <Shield size={20} className="text-primary" />
              <div>
                <div className="font-medium">Персональная аналитика</div>
                <div className="text-sm text-muted">Детальная статистика рынка</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5">
              <User size={20} className="text-primary" />
              <div>
                <div className="font-medium">Живая лента предложений</div>
                <div className="text-sm text-muted">Выгодные лоты в реальном времени</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5">
              <Gamepad2 size={20} className="text-primary" />
              <div>
                <div className="font-medium">Избранные предметы</div>
                <div className="text-sm text-muted">Отслеживание артефактов</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5">
              <Calendar size={20} className="text-primary" />
              <div>
                <div className="font-medium">Портфель</div>
                <div className="text-sm text-muted">Учёт сделок и прибыли</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10">
          <button
            onClick={() => router.push('/plus')}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-medium transition-all hover:scale-105 shadow-lg shadow-yellow-500/30"
          >
            <Crown size={20} />
            <span>Insight Plus</span>
          </button>
        </div>
      </div>
    </div>
  );
}
