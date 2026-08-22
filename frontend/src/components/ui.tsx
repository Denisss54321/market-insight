"use client";

import clsx from "clsx";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { Info, Wallet, TrendingUp, TrendingDown, Activity, Trophy, AlertCircle } from "lucide-react";
import { ReactNode, useEffect, useState, useRef } from "react";

export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format: (value: number) => string;
  className?: string;
}) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 20 });
  const output = useTransform(spring, (current) => format(current));
  const [text, setText] = useState(format(value));

  useEffect(() => motionValue.set(value), [motionValue, value]);
  useEffect(() => output.on("change", (latest) => setText(latest as string)), [output]);

  return <span className={clsx("num", className)}>{text}</span>;
}

export function Tooltip({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <span className="group relative inline-flex items-center">
      {children ?? <Info size={13} className="text-muted/70" />}
      <span className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 hidden w-64 -translate-x-1/2 rounded-xl border border-white/10 bg-[#0d1626] p-3 text-xs leading-relaxed text-muted shadow-card group-hover:block">
        {text}
      </span>
    </span>
  );
}

export function Card({
  title,
  action,
  children,
  className,
  hint,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <section className={clsx("card p-4", className)} style={{ overflow: 'visible', position: 'relative' }}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-1.5 text-sm font-medium text-white/90">
            {title}
            {hint && <Tooltip text={hint} />}
          </h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  accent,
  sub,
  icon,
  isEmpty,
  onClick,
  previousValue,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "primary" | "success" | "danger" | "warning";
  sub?: ReactNode;
  icon?: ReactNode;
  isEmpty?: boolean;
  onClick?: () => void;
  previousValue?: number;
}) {
  const accents = {
    primary: "text-primary",
    success: "text-success",
    danger: "text-danger",
    warning: "text-warning",
  } as const;
  
  const [isPulsing, setIsPulsing] = useState(false);
  const prevValueRef = useRef(previousValue);
  
  // Пульсация при изменении значения
  useEffect(() => {
    if (previousValue !== undefined && prevValueRef.current !== previousValue) {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 600);
    }
    prevValueRef.current = previousValue;
  }, [previousValue]);
  
  // Иконки по умолчанию для разных метрик
  const defaultIcon = icon || (() => {
    if (label.includes("позициях") || label.includes("Вложено")) return <Wallet size={16} />;
    if (label.includes("прибыль") && accent === "success") return <TrendingUp size={16} />;
    if (label.includes("прибыль") && accent === "danger") return <TrendingDown size={16} />;
    if (label.includes("Доля") || label.includes("ROI")) return <Activity size={16} />;
    if (label.includes("Лучшая")) return <Trophy size={16} />;
    if (label.includes("Худшая")) return <AlertCircle size={16} />;
    return null;
  })();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={clsx(
        "card card-hover p-4 cursor-pointer relative overflow-hidden",
        onClick && "ring-2 ring-transparent hover:ring-primary/30"
      )}
      style={{ transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out' }}
    >
      <AnimatePresence>
        {isPulsing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 bg-primary/20 pointer-events-none"
          />
        )}
      </AnimatePresence>
      
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {defaultIcon && (
            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4, type: "spring" }}
              className={clsx(
                "p-1.5 rounded-lg",
                accent === "success" ? "bg-success/10 text-success" :
                accent === "danger" ? "bg-danger/10 text-danger" :
                accent === "warning" ? "bg-warning/10 text-warning" :
                "bg-primary/10 text-primary"
              )}
            >
              {defaultIcon}
            </motion.div>
          )}
          <span className="stat-label">{label}</span>
          {hint && <Tooltip text={hint} />}
        </div>
        {onClick && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-muted/50 hover:text-muted transition-colors"
          >
            <Activity size={14} />
          </motion.div>
        )}
      </div>
      
      <div className="mt-3">
        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-muted/60"
          >
            <AlertCircle size={14} />
            <span className="text-sm">Нет данных</span>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={clsx("text-2xl font-semibold", accent && accents[accent])}
          >
            {typeof value === 'number' ? (
              <AnimatedNumber value={value} format={(v) => v.toString()} />
            ) : (
              value
            )}
          </motion.div>
        )}
      </div>
      
      {sub && !isEmpty && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-1 text-xs text-muted"
        >
          {sub}
        </motion.div>
      )}
      
      {isEmpty && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-2 text-xs text-muted/60"
        >
          Добавьте первую сделку
        </motion.div>
      )}
    </motion.div>
  );
}

export function Delta({ value, digits = 1 }: { value: number | null; digits?: number }) {
  if (value === null) return <span className="num text-sm text-muted">—</span>;
  const positive = value > 0;
  const zero = Math.abs(value) < 0.005;
  return (
    <span
      className={clsx(
        "num text-sm",
        zero ? "text-muted" : positive ? "text-success" : "text-danger",
      )}
    >
      {zero ? "0%" : `${positive ? "+" : ""}${value.toFixed(digits)}%`}
    </span>
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "success" | "danger" | "warning" | "primary";
}) {
  const tones = {
    muted: "bg-white/5 text-muted",
    success: "bg-success/15 text-success",
    danger: "bg-danger/15 text-danger",
    warning: "bg-warning/15 text-warning",
    primary: "bg-primary/15 text-primary",
  } as const;
  return (
    <span className={clsx("rounded-lg px-2 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function ConfidenceBar({ value }: { value: number | null }) {
  if (value === null) return <span className="num text-xs text-muted">—</span>;
  const tone = value >= 70 ? "bg-success" : value >= 40 ? "bg-warning" : "bg-danger";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10">
        <div className={clsx("h-full rounded-full", tone)} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="num text-xs text-muted">{value.toFixed(0)}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-xl bg-white/5", className)} />;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
      <p className="text-sm text-white/80">{title}</p>
      {hint && <p className="max-w-md text-xs text-muted">{hint}</p>}
    </div>
  );
}
