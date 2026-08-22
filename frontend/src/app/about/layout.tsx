import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "О проекте — SZINSIGHT",
  description: "Узнайте больше о платформе Market Insight и её возможностях",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full max-w-full mx-auto px-0 py-0 relative z-10" style={{ margin: 0, padding: 0, maxWidth: '100%', marginTop: '-24px' }}>
      {children}
    </main>
  );
}
