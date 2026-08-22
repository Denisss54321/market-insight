"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "http://localhost:8002";

export default function ExboAuthPage() {
  const router = useRouter();

  useEffect(() => {
    // Перенаправляем на backend OAuth endpoint
    window.location.href = `${API_BASE}/auth/exbo`;
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted">Перенаправление на авторизацию Exbo...</p>
      </div>
    </div>
  );
}
