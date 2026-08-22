"use client";

import { Shield, Crown, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthRequired() {
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl" />
            <div className="relative bg-[#0d1626] border border-white/10 rounded-full p-6">
              <Shield size={48} className="text-primary" />
            </div>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-3 text-white">
          Требуется авторизация
        </h2>
        
        <p className="text-muted mb-8">
          Для доступа к этой функции необходимо войти в аккаунт. 
          После авторизации ваши данные будут синхронизироваться между устройствами.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => router.push('/auth/steam')}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-all hover:scale-105"
          >
            <Shield size={18} />
            <span className="font-medium">Войти через Steam</span>
          </button>
          
          <button
            onClick={() => router.push('/auth/exbo')}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 transition-all hover:scale-105"
          >
            <Shield size={18} />
            <span className="font-medium">Войти через Exbo</span>
          </button>
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex items-center justify-center gap-2 text-sm text-muted">
            <Crown size={16} className="text-yellow-500" />
            <span>Insight Plus</span>
            <ArrowRight size={14} />
            <span>Расширенные возможности</span>
          </div>
        </div>
      </div>
    </div>
  );
}
