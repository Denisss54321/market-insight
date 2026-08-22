"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Info } from "lucide-react";
import clsx from "clsx";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  type?: ToastType;
  message: string;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ type = "success", message, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <Check size={18} className="text-success" />,
    error: <X size={18} className="text-danger" />,
    info: <Info size={18} className="text-primary" />,
  };

  const bgColors = {
    success: "bg-success/10 border-success/30",
    error: "bg-danger/10 border-danger/30",
    info: "bg-primary/10 border-primary/30",
  };

  const content = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={clsx(
            "flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-sm",
            bgColors[type]
          )}
        >
          <div className="flex-shrink-0">{icons[type]}</div>
          <span className="text-sm font-medium">{message}</span>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose?.(), 300);
            }}
            className="flex-shrink-0 ml-2 text-muted-foreground hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return content;
}

// Хук для управления тостами
let toastId = 0;

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (message: string) => showToast("success", message);
  const error = (message: string) => showToast("error", message);
  const info = (message: string) => showToast("info", message);

  return {
    toasts,
    removeToast,
    success,
    error,
    info,
  };
}

export function ToastContainer({ toasts, removeToast }: { toasts: ToastItem[]; removeToast: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
