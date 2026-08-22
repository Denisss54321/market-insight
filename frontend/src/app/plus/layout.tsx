import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Insight Plus — SZINSIGHT",
  description: "Премиум подписка с расширенными возможностями для профессиональной торговли",
};

export default function PlusLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full max-w-full mx-auto px-0 py-0 relative z-10" style={{ margin: 0, padding: 0, maxWidth: '100%', marginTop: '-24px' }}>
      {children}
    </main>
  );
}
