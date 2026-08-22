"use client";

import clsx from "clsx";
import { Star, X, Search, Filter, ArrowUpDown, Sparkles, TrendingUp, Zap, Grid, List } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Badge, Card, ConfidenceBar, Delta, EmptyState, Skeleton, Tooltip } from "@/components/ui";
import { api, ItemRow } from "@/lib/api";
import { categoryName, liquidity, money, num, qualityColor, timeAgo } from "@/lib/format";

const QUALITIES = ["Обычный", "Необычный", "Особый", "Редкий", "Исключительный", "Легендарный"];
const UPGRADE_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

const COLUMNS: { key: string; label: string; hint?: string }[] = [
  { key: "name", label: "Артефакт" },
  { key: "variants", label: "Варианты" },
  { key: "price", label: "ЦЕНА" },
  { key: "liquidity", label: "Ликвидность" },
  { key: "change24h", label: "24 ч" },
  { key: "activeLots", label: "Лотов" },
  { key: "confidence", label: "Доверие" },
  { key: "updated", label: "Обновлено" },
];

const SORTABLE = new Set([
  "price",
  "change24h",
  "liquidity",
]);

export default function CatalogPage() {
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<{ id: string; count: number }[]>([]);
  const [sort, setSort] = useState("liquidity");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const limit = 40;

  // Debounce для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    api<{ id: string; count: number }[]>("/api/categories").then(setCategories).catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      search: debouncedSearch,
      category,
      sort,
      order,
      limit: String(limit),
      offset: String(page * limit),
    });
    api<{ total: number; items: ItemRow[] }>(`/api/catalog?${params}`)
      .then((data) => {
        setRows(data.items);
        setTotal(data.total);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [debouncedSearch, category, sort, order, page]);

  const toggleSort = (key: string) => {
    if (!SORTABLE.has(key)) return;
    if (sort === key) setOrder(order === "desc" ? "asc" : "desc");
    else {
      setSort(key);
      setOrder("desc");
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero секция */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
        
        <div className="relative">
          <h1 className="text-3xl font-bold mb-2">Каталог артефактов</h1>
          <p className="text-muted-foreground mb-6">
            Рыночная цена считается по завершённым сделкам после фильтра выбросов, а не по минимальному активному лоту.
          </p>
          
          {/* Поиск */}
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="input pl-12 pr-12 h-12 text-base"
              placeholder="Поиск по названию..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                onClick={() => setSearch("")}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Фильтры и сортировка */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-3"
      >
        <button
          className={clsx(
            "px-4 py-2 rounded-xl text-sm font-medium transition-all",
            !category 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "bg-white/5 text-muted-foreground hover:bg-white/10"
          )}
          onClick={() => {
            setCategory("");
            setPage(0);
          }}
        >
          Все
        </button>
        {categories.map((item) => (
          <button
            key={item.id}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              category === item.id 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            )}
            onClick={() => {
              setCategory(item.id);
              setPage(0);
            }}
          >
            {categoryName(item.id)} · {item.count}
          </button>
        ))}
        
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{total} позиций</span>
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
            <button
              className={clsx(
                "p-2 rounded-lg transition-all",
                viewMode === "grid" ? "bg-primary text-white" : "text-muted-foreground hover:text-white hover:bg-white/10"
              )}
              onClick={() => setViewMode("grid")}
            >
              <Grid size={16} />
            </button>
            <button
              className={clsx(
                "p-2 rounded-lg transition-all",
                viewMode === "list" ? "bg-primary text-white" : "text-muted-foreground hover:text-white hover:bg-white/10"
              )}
              onClick={() => setViewMode("list")}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Сортировка */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-2"
      >
        <Filter size={16} className="text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Сортировка:</span>
        {COLUMNS.filter(col => SORTABLE.has(col.key)).map((column) => (
          <button
            key={column.key}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              sort === column.key 
                ? "bg-primary/20 text-primary border border-primary/30" 
                : "text-muted-foreground hover:bg-white/10 hover:text-white"
            )}
            onClick={() => toggleSort(column.key)}
          >
            {column.label}
            {sort === column.key && (
              <ArrowUpDown size={12} className={clsx("inline ml-1", order === "desc" ? "rotate-180" : "")} />
            )}
          </button>
        ))}
      </motion.div>

      {/* Сетка карточек */}
      {loading && rows.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div
            layout
            className={clsx(
              "gap-4",
              viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "flex flex-col"
            )}
          >
            {rows.map((row, index) => (
              <motion.div
                key={row.id}
                layout
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -30 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 h-full"
              >
                {/* Декоративные градиенты */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <Link href={`/item/${row.id}`} className="relative z-10 block p-5 h-full flex flex-col">
                  <div className="flex items-start gap-4 flex-shrink-0">
                    {/* Иконка */}
                    <div className="relative flex-shrink-0">
                      <div className="relative rounded-xl overflow-hidden h-16 w-16">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={row.icon} alt="" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                    </div>

                    {/* Информация */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base mb-1 truncate">{row.name}</h3>
                      <div className="text-sm text-muted-foreground mb-2">{categoryName(row.category)}</div>
                      
                      {/* Варианты */}
                      {row.variants && row.variants.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {row.variants.slice(0, 4).map((variant, idx) => (
                            <Link
                              key={`${row.id}-${variant.quality}-${variant.upgradeLevel}`}
                              href={`/item/${row.id}?quality=${encodeURIComponent(variant.quality)}&upgrade_level=${variant.upgradeLevel}`}
                              className="px-2 py-0.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                              style={{
                                backgroundColor: variant.quality && variant.quality !== "Обычный" 
                                  ? `${qualityColor(variant.quality)}25` 
                                  : "rgba(255,255,255,0.1)",
                                color: variant.quality && variant.quality !== "Обычный" 
                                  ? qualityColor(variant.quality) 
                                  : "rgba(255,255,255,0.7)",
                                border: variant.quality && variant.quality !== "Обычный" 
                                  ? `1px solid ${qualityColor(variant.quality)}40` 
                                  : "1px solid rgba(255,255,255,0.1)",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {variant.quality || "—"}{variant.upgradeLevel > 0 ? ` +${variant.upgradeLevel}` : ""}
                            </Link>
                          ))}
                          {row.variants.length > 4 && (
                            <span className="px-2 py-0.5 rounded-lg text-xs text-muted-foreground">
                              +{row.variants.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-grow" />

                  {/* Метрики */}
                  <div className="mt-4 grid grid-cols-2 gap-3 flex-shrink-0">
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="text-xs text-muted-foreground mb-1">Цена</div>
                      <div className="font-bold text-sm">
                        {row.minPrice !== null && row.maxPrice !== null && row.minPrice !== row.maxPrice ? (
                          <div className="text-xs">
                            {money(row.minPrice)} — {money(row.maxPrice)}
                          </div>
                        ) : row.marketPrice !== null ? (
                          money(row.marketPrice)
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="text-xs text-muted-foreground mb-1">Ликвидность</div>
                      <div className="font-bold text-sm">
                        {row.totalLiquidity !== null ? `${liquidity(row.totalLiquidity)}/д` : (row.liquidity !== null ? `${liquidity(row.liquidity)}/д` : "—")}
                      </div>
                    </div>
                  </div>

                  {/* Нижняя панель */}
                  <div className="mt-3 flex items-center justify-between flex-shrink-0">
                    <Delta value={row.change24h} />
                    <button
                      className="p-2 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary transition-all"
                      title="В наблюдение"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        api("/api/watchlist", {
                          method: "POST",
                          body: JSON.stringify({ itemId: row.id }),
                        }).catch(() => undefined);
                      }}
                    >
                      <Star size={16} />
                    </button>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Пагинация */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-center gap-4"
      >
        <button
          className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          Назад
        </button>
        <span className="text-sm text-muted-foreground">
          {page * limit + 1}–{Math.min(total, (page + 1) * limit)} из {total}
        </span>
        <button
          className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={(page + 1) * limit >= total}
          onClick={() => setPage(page + 1)}
        >
          Вперёд
        </button>
      </motion.div>
    </div>
  );
}
