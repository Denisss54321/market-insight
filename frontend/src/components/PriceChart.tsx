"use client";

import { ColorType, IChartApi, createChart } from "lightweight-charts";
import { useEffect, useRef } from "react";

export type ChartPoint = { time: number; value: number; low: number; high: number; volume: number };

export default function PriceChart({ points, mode }: { points: ChartPoint[]; mode: "price" | "sales" }) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!container.current) return;
    const instance = createChart(container.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8A9AB5",
        fontFamily: "var(--font-inter), sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.06)" },
      timeScale: { borderColor: "rgba(255,255,255,0.06)", timeVisible: true, local: true },
      crosshair: { mode: 1 },
      height: 340,
    });
    chart.current = instance;

    const volume = instance.addHistogramSeries({
      color: "rgba(79,140,255,0.35)",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    instance.priceScale("volume").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    if (mode === "price") {
      // Режим истории цены - area chart
      const area = instance.addAreaSeries({
        lineColor: "#4F8CFF",
        topColor: "rgba(79,140,255,0.35)",
        bottomColor: "rgba(79,140,255,0.02)",
        lineWidth: 2,
        priceFormat: { type: "price", precision: 0, minMove: 1 },
      });
      area.setData(points.map((point) => ({ time: point.time as never, value: point.value })));
    } else {
      // Режим истории продаж - line chart
      const line = instance.addLineSeries({
        color: "#4F8CFF",
        lineWidth: 1,
        priceFormat: { type: "price", precision: 0, minMove: 1 },
      });
      line.setData(points.map((point) => ({ time: point.time as never, value: point.value })));
    }
    
    volume.setData(points.map((point) => ({ time: point.time as never, value: point.volume })));
    instance.timeScale().fitContent();

    const resize = () =>
      instance.applyOptions({ width: container.current?.clientWidth ?? 600 });
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      instance.remove();
    };
  }, [points, mode]);

  return <div ref={container} className="w-full" />;
}

export function MiniChart({ points }: { points: ChartPoint[] }) {
  if (!points || points.length === 0) {
    return null;
  }

  // Создаем красивый SVG график для фона
  const width = 100;
  const height = 100;
  const padding = 0;
  
  const values = points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  // Нормализуем значения для SVG
  const normalizedPoints = values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return { x, y };
  });

  // Создаем путь для линии
  const linePath = normalizedPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  // Создаем путь для градиента (закрываем внизу)
  const areaPath = `${linePath} L ${normalizedPoints[normalizedPoints.length - 1].x} ${height} L ${normalizedPoints[0].x} ${height} Z`;

  // Определяем цвет на основе тренда
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const isPositive = lastValue >= firstValue;
  const color = isPositive ? '#22c55e' : '#ef4444';

  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox={`0 0 ${width} ${height}`} 
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full"
    >
      <defs>
        <linearGradient id={`gradient-${isPositive ? 'up' : 'down'}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Градиент под линией */}
      <path
        d={areaPath}
        fill={`url(#gradient-${isPositive ? 'up' : 'down'})`}
        stroke="none"
      />
      {/* Линия */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
