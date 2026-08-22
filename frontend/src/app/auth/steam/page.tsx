"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SteamAuthPage() {
  const router = useRouter();

  useEffect(() => {
    // Перенаправляем на backend OAuth endpoint
    window.location.href = "http://localhost:8002/auth/steam";
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted">Перенаправление на авторизацию Steam...</p>
      </div>
    </div>
  );
}
