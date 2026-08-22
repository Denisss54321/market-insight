"use client";



import clsx from "clsx";

import { useRouter, useSearchParams } from "next/navigation";

import { useState, useEffect, useMemo } from "react";

import dynamic from "next/dynamic";

import { Star, Wallet, Sparkles, TrendingUp, Flame, Shield, Zap, Bell } from "lucide-react";

import { motion } from "framer-motion";



import { ChartPoint } from "@/components/PriceChart";

import ToggleSwitch from "@/components/ToggleSwitch";

import { Badge, Card, ConfidenceBar, Delta, EmptyState, KpiCard, Skeleton, Tooltip } from "@/components/ui";

import { useToast, ToastContainer } from "@/components/ui/Toast";

import { ItemRow, ItemVariant, api } from "@/lib/api";

import { categoryName, liquidity, money, num, qualityColor, timeAgo, timeLeft } from "@/lib/format";



const PriceChart = dynamic(() => import("@/components/PriceChart"), { ssr: false });



type Detail = { item: ItemRow; lots: LotRow[]; variants: ItemVariant[] };

type LotRow = {

  unitPrice: number;

  price: number;

  amount: number;

  quality: string;

  upgradeLevel: number;

  endsAt: string | null;

  profit: number;

};

type SaleRow = {

  unitPrice: number;

  price: number;

  amount: number;

  quality: string;

  upgradeLevel: number;

  soldAt: string;

};

type History = {

  points: ChartPoint[];

  histogram: { price: number; count: number }[];

  seasonality: { hour: number; sales: number; median: number }[];

  totalSales: number;

  firstSaleAt: string | null;

};



const RANGES = [

  { days: 1, label: "24 ч" },

  { days: 3, label: "3 д" },

  { days: 7, label: "7 д" },

  { days: 30, label: "30 д" },

  { days: 90, label: "90 д" },

];



const QUALITY_ORDER = ["Обычный", "Необычный", "Особый", "Редкий", "Исключительный", "Легендарный"];



export default function ItemPage({ params }: { params: { id: string } }) {

  const router = useRouter();

  const searchParams = useSearchParams();

  

  const [detail, setDetail] = useState<Detail | null>(null);

  const [history, setHistory] = useState<History | null>(null);

  const [sales, setSales] = useState<SaleRow[] | null>(null);

  const [days, setDays] = useState(7);

  const [chartMode, setChartMode] = useState<"price" | "sales">("price");

  const [lotsMode, setLotsMode] = useState<"active" | "sold">("active");

  const { toasts, removeToast, success, error } = useToast();

  const [isWatched, setIsWatched] = useState(false);



  // Локальное состояние для качества и заточки

  const [selectedQuality, setSelectedQuality] = useState(() => 

    decodeURIComponent(searchParams.get("quality") ?? "")

  );

  const [selectedUpgrade, setSelectedUpgrade] = useState(() => 

    Number(searchParams.get("upgrade_level") ?? 0)

  );



  // Сбрасываем состояние при изменении ID предмета (переход на другой предмет)

  useEffect(() => {

    const quality = searchParams.get("quality");

    const upgrade = searchParams.get("upgrade_level");

    setSelectedQuality(quality ? decodeURIComponent(quality) : "");

    setSelectedUpgrade(upgrade ? Number(upgrade) : 0);

    setIsWatched(false);

  }, [params.id]);



  // Если качество не выбрано, автоматически выбираем первый доступный вариант

  useEffect(() => {

    if (detail && detail.variants && detail.variants.length > 0 && !selectedQuality) {

      const firstQuality = QUALITY_ORDER.find(q => detail.variants.some(v => v.quality === q));

      if (firstQuality) {

        setVariant(firstQuality, 0);

      }

    }

  }, [detail, selectedQuality]);



  // Единая точка изменения выбранного варианта — обновляет URL и локальное состояние

  const setVariant = (quality: string, upgrade: number) => {

    setSelectedQuality(quality);

    setSelectedUpgrade(upgrade);

    

    const newParams = new URLSearchParams();

    if (quality) newParams.set("quality", quality);

    // Явно добавляем upgrade_level только если > 0

    if (upgrade > 0) {

      newParams.set("upgrade_level", String(upgrade));

    }

    // Если upgrade = 0, параметр просто не добавляется в URL

    const query = newParams.toString();

    router.replace(`/item/${params.id}${query ? `?${query}` : ""}`, { scroll: false });

  };



  useEffect(() => {

    const load = () => {

      const queryParams = new URLSearchParams();

      if (selectedQuality) queryParams.set("quality", selectedQuality);

      if (selectedUpgrade > 0) queryParams.set("upgrade_level", String(selectedUpgrade));

      const query = queryParams.toString();

      api<Detail>(`/api/items/${params.id}${query ? `?${query}` : ""}`).then(setDetail).catch(() => undefined);

    };

    load();

    const timer = setInterval(load, 15000);

    return () => clearInterval(timer);

  }, [params.id, selectedQuality, selectedUpgrade]);



  useEffect(() => {

    const queryParams = new URLSearchParams({ days: String(days), mode: chartMode });

    if (selectedQuality) queryParams.set("quality", selectedQuality);

    if (selectedUpgrade > 0) queryParams.set("upgrade_level", String(selectedUpgrade));

    api<History>(`/api/items/${params.id}/history?${queryParams.toString()}`)

      .then(setHistory)

      .catch(() => undefined);

  }, [params.id, days, selectedQuality, selectedUpgrade, chartMode]);



  useEffect(() => {

    const queryParams = new URLSearchParams();

    if (selectedQuality) queryParams.set("quality", selectedQuality);

    if (selectedUpgrade > 0) queryParams.set("upgrade_level", String(selectedUpgrade));

    api<{ sales: SaleRow[] }>(`/api/items/${params.id}/sales?${queryParams.toString()}`)

      .then((data) => setSales(data.sales))

      .catch(() => undefined);

  }, [params.id, selectedQuality, selectedUpgrade]);



  const maxHistogram = useMemo(

    () => Math.max(1, ...(history?.histogram ?? []).map((bucket) => bucket.count)),

    [history],

  );

  const maxSeason = useMemo(

    () => Math.max(1, ...(history?.seasonality ?? []).map((hour) => hour.sales)),

    [history],

  );



  if (!detail) return <Skeleton className="h-96" />;

  const item = detail.item;



  return (

    <div className="space-y-6">

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Шапка с информацией о предмете */}

      <motion.div 

        initial={{ opacity: 0, y: -20 }}

        animate={{ opacity: 1, y: 0 }}

        className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d1626] via-[#101a2b] to-[#0d1626] p-6 shadow-2xl"

      >

        {/* Декоративные элементы */}

        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl" />

        

        <div className="relative flex items-start gap-6">

          {/* Иконка предмета */}

          <div className="relative flex-shrink-0">

            {/* eslint-disable-next-line @next/next/no-img-element */}

            <img 

              src={item.icon} 

              alt="" 

              className="h-20 w-20 rounded-2xl border-2 border-white/10 shadow-lg object-cover"

            />

            {(selectedQuality || item.quality) && (

              <div 

                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-2 border-[#0d1626] flex items-center justify-center"

                style={{ backgroundColor: qualityColor(selectedQuality || item.quality || "") }}

              >

                <Sparkles size={12} className="text-white" />

              </div>

            )}

          </div>

          

          {/* Информация о предмете */}

          <div className="flex-1 min-w-0">

            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">

              {item.name}

            </h1>

            <div className="flex flex-wrap items-center gap-3 text-sm mb-3">

              <span className="text-muted-foreground">{item.nameEn}</span>

              <span className="text-muted-foreground">·</span>

              <span className="text-muted-foreground">{categoryName(item.category)}</span>

              <span className="text-muted-foreground">·</span>

              <span className="text-muted-foreground">ID {item.id}</span>

            </div>

            {(selectedQuality || item.quality) && (

              <div className="flex items-center gap-2">

                <span 

                  className="text-xs px-3 py-1.5 rounded-full border"

                  style={{ 

                    backgroundColor: `${qualityColor(selectedQuality || item.quality || "")}20`,

                    color: qualityColor(selectedQuality || item.quality || ""),

                    borderColor: `${qualityColor(selectedQuality || item.quality || "")}40`

                  }}

                >

                  {selectedQuality || item.quality}

                </span>

                {(selectedUpgrade > 0 ? selectedUpgrade : item.upgradeLevel) > 0 && (

                  <span className="text-xs px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary">

                    +{selectedUpgrade > 0 ? selectedUpgrade : item.upgradeLevel}

                  </span>

                )}

              </div>

            )}

          </div>

          

          {/* Кнопки действий */}

          <div className="flex items-center gap-3">

            <button

              className={clsx(

                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",

                isWatched 

                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/30" 

                  : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border-white/10 hover:border-white/20"

              )}

              onClick={() => {

                api("/api/watchlist", {

                  method: "POST",

                  body: JSON.stringify({ itemId: item.id, quality: selectedQuality, upgradeLevel: selectedUpgrade }),

                })

                  .then(() => {

                    setIsWatched(true);

                    success("Добавлено в наблюдение");

                  })

                  .catch(() => error("Не удалось добавить"))

              }}

            >

              <Star size={16} fill={isWatched ? "currentColor" : "none"} /> {isWatched ? "В наблюдении" : "В наблюдение"}

            </button>

            <button

              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 text-primary transition-all border border-primary/30 hover:border-primary/50"

              onClick={() => {

                const token = localStorage.getItem('auth_token');

                if (!token) {

                  error("Не авторизован");

                  return;

                }

                api("/api/deals", {

                  method: "POST",

                  body: JSON.stringify({

                    token,

                    user: "local",

                    itemId: item.id,

                    buyPrice: detail.lots[0]?.unitPrice ?? item.marketPrice ?? 0,

                    quality: selectedQuality,

                    upgradeLevel: selectedUpgrade,

                    amount: 1,

                  }),

                })

                  .then(() => {

                    success("Сделка добавлена в портфель");

                    localStorage.removeItem('cached_user');

                  })

                  .catch(() => error("Не удалось добавить сделку"))

              }

            }

            >

              <Wallet size={16} /> Я купил

            </button>

          </div>

        </div>

      </motion.div>



      {detail.variants && detail.variants.length > 1 && (

        <motion.div 

          initial={{ opacity: 0, y: 10 }}

          animate={{ opacity: 1, y: 0 }}

          className="rounded-2xl border border-white/10 bg-[#101a2b] p-5 shadow-xl"

        >

          <div className="flex items-center justify-between mb-4">

            <h3 className="text-lg font-semibold">Варианты по качеству и заточке</h3>

            <span className="text-xs text-muted-foreground">Выберите вариант для просмотра отдельной статистики</span>

          </div>

          <div className="space-y-4">

            <div className="flex flex-wrap gap-2">

              {QUALITY_ORDER

                .filter(q => detail.variants.some(v => v.quality === q))

                .map((quality) => (

                  <button

                    key={quality}

                    className={clsx(

                      "px-4 py-2 rounded-xl text-sm font-medium transition-all border",

                      selectedQuality === quality

                        ? quality === "Обычный"

                          ? "bg-white/90 text-gray-900 shadow-lg border-white/20"

                          : "text-white shadow-lg border-transparent"

                        : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border-white/10 hover:border-white/20"

                    )}

                    onClick={() => setVariant(quality, selectedUpgrade)}

                    style={selectedQuality === quality && quality !== "Обычный" ? { backgroundColor: qualityColor(quality), boxShadow: `0 10px 15px -3px ${qualityColor(quality)}40`, borderColor: qualityColor(quality) } : {}}

                  >

                    {quality}

                  </button>

                ))}

            </div>

            <div className="flex items-center gap-4">

              <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">

                {Array.from({ length: 16 }, (_, i) => i).map((upgrade) => (

                  <button

                    key={upgrade}

                    className={clsx(

                      "px-3 py-1.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap border",

                      selectedUpgrade === upgrade

                        ? "bg-primary text-white border-primary"

                        : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border-white/10 hover:border-white/20"

                    )}

                    onClick={() => setVariant(selectedQuality, upgrade)}

                  >

                    {upgrade === 0 ? "0" : `+${upgrade}`}

                  </button>

                ))}

              </div>

            </div>

          </div>

        </motion.div>

      )}



      <motion.div 

        initial={{ opacity: 0, y: 10 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ delay: 0.1 }}

        className="grid grid-cols-2 gap-3 lg:grid-cols-6"

      >

        {item.sampleSize === 0 ? (

          <div className="col-span-2 lg:col-span-6">

            <EmptyState title="Нет данных" hint="Для этого варианта недостаточно продаж для расчета статистики." />

          </div>

        ) : (

          <>

            <KpiCard

              label="Рыночная цена"

              value={money(item.marketPrice ?? 0)}

              hint="Медиана цены за штуку по завершённым сделкам после отсева выбросов методом MAD."

              accent="primary"

            />

            <KpiCard label="Минимальный лот" value={money(item.lowestLot ?? 0)} sub={`лотов: ${item.activeLots}`} />

            <KpiCard

              label="Спред"

              value={`${(item.spread ?? 0).toFixed(1)}%`}

              hint="Насколько минимальный активный лот ниже рыночной цены."

            />

            <KpiCard

              label="Ликвидность"

              value={`${liquidity(item.liquidity ?? 0)}/д`}

              hint="Сколько единиц продаётся в среднем за сутки. Чем выше, тем быстрее перепродажа."

            />

            <KpiCard

              label="Волатильность"

              value={`${((item.volatility ?? 0) * 100).toFixed(1)}%`}

              hint="Коэффициент вариации цен сделок: разброс относительно медианы."

            />

            <KpiCard

              label="Доверие"

              value={<ConfidenceBar value={item.confidence} />}

              hint="Складывается из размера выборки, свежести данных и разброса цен. Ниже 40 — оценке верить нельзя."

              sub={`выборка: ${item.sampleSize} сделок`}

            />

          </>

        )}

      </motion.div>



      <motion.div 

        initial={{ opacity: 0, y: 10 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ delay: 0.2 }}

        className="grid gap-3 lg:grid-cols-3"

      >

        <Card

          className="lg:col-span-2"

          title="История цены"

          action={

            <div className="flex gap-6 items-center">

              <div className="flex items-center gap-2">

                <span className="text-xs text-muted-foreground">Период:</span>

                <div className="flex gap-1">

                  {RANGES.map((range) => (

                    <button

                      key={range.days}

                      className={clsx(

                        "px-3 py-1.5 text-sm font-medium transition-all border-b-2",

                        days === range.days

                          ? "border-primary text-white"

                          : "border-transparent text-muted-foreground hover:text-white"

                      )}

                      onClick={() => setDays(range.days)}

                    >

                      {range.label}

                    </button>

                  ))}

                </div>

              </div>

              <ToggleSwitch

                value={chartMode === "sales"}

                onChange={(value) => setChartMode(value ? "sales" : "price")}

                labelLeft="Цена"

                labelRight="Продажи"

              />

            </div>

          }

        >

          {history?.points?.length ? (

            <PriceChart key={chartMode} points={history.points} mode={chartMode} />

          ) : (

            <EmptyState

              title="Данных пока мало"

              hint="История накапливается с момента запуска коллектора: API отдаёт только последние сделки."

            />

          )}

          <p className="mt-2 text-xs text-muted">

            Сделок в выборке: {history?.totalSales ?? 0}

            {history?.firstSaleAt ? ` · данные с ${new Date(history.firstSaleAt).toLocaleDateString("ru-RU")}` : ""}

          </p>

        </Card>



        <Card

          title="Распределение сделок"

          hint="Гистограмма цен завершённых продаж. Пик показывает, где на самом деле находится рынок, а хвосты — единичные выбросы."

        >

          <div className="flex h-[340px] items-end gap-[3px]">

            {(history?.histogram ?? []).map((bucket) => (

              <div key={bucket.price} className="group relative flex-1">

                <div

                  className="w-full rounded-t bg-primary/60 transition-colors group-hover:bg-primary"

                  style={{ height: `${(bucket.count / maxHistogram) * 300}px` }}

                />

                <div className="pointer-events-none absolute bottom-full left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#0d1626] px-2 py-1 text-xs group-hover:block">

                  {money(bucket.price)} · {bucket.count}

                </div>

              </div>

            ))}

          </div>

        </Card>

      </motion.div>



      <motion.div 

        initial={{ opacity: 0, y: 10 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ delay: 0.3 }}

        className="grid gap-3 lg:grid-cols-3"

      >

        <Card 

          className="lg:col-span-2" 

          title={lotsMode === "active" ? "Активные лоты" : "Продажи"}

          hint={lotsMode === "active" ? "Прибыль считается с учётом комиссии от рыночной цены." : "Последние продажи этого предмета."}

          action={

            <ToggleSwitch

              value={lotsMode === "sold"}

              onChange={(value) => setLotsMode(value ? "sold" : "active")}

              labelLeft="Активные"

              labelRight="Продажи"

            />

          }

        >

          {lotsMode === "active" ? (

            <div className="max-h-80 overflow-auto rounded-xl border border-white/5">

              <table className="w-full">

                <thead className="sticky top-0 bg-[#101a2b]">

                  <tr>

                    <th className="th">Цена</th>

                    <th className="th">Качество</th>

                    <th className="th">Заточка</th>

                    <th className="th">Прибыль</th>

                    <th className="th">Осталось</th>

                  </tr>

                </thead>

                <tbody>

                  {detail.lots.map((lot, index) => (

                    <tr key={`${lot.unitPrice}-${index}`} className="border-t border-white/5">

                      <td className="td num">{money(lot.price)}</td>

                      <td className="td text-muted">{lot.quality || "—"}</td>

                      <td className="td text-muted">{lot.upgradeLevel > 0 ? `+${lot.upgradeLevel}` : "—"}</td>

                      <td className="td">

                        {lot.profit > 0 ? (

                          <Badge tone="success">+{money(lot.profit)}</Badge>

                        ) : (

                          <span className="num text-muted">{money(lot.profit)}</span>

                        )}

                      </td>

                      <td className="td text-muted">{timeLeft(lot.endsAt)}</td>

                    </tr>

                  ))}

                </tbody>

              </table>

              {detail.lots.length === 0 && <EmptyState title="Активных лотов нет" />}

            </div>

          ) : (

            <div className="max-h-80 overflow-auto rounded-xl border border-white/5">

              <table className="w-full">

                <thead className="sticky top-0 bg-[#101a2b]">

                  <tr>

                    <th className="th">Цена</th>

                    <th className="th">Качество</th>

                    <th className="th">Заточка</th>

                    <th className="th">Время продажи</th>

                  </tr>

                </thead>

                <tbody>

                  {sales?.map((sale, index) => (

                    <tr key={`${sale.unitPrice}-${index}`} className="border-t border-white/5">

                      <td className="td num">{money(sale.price)}</td>

                      <td className="td text-muted">{sale.quality || "—"}</td>

                      <td className="td text-muted">{sale.upgradeLevel > 0 ? `+${sale.upgradeLevel}` : "—"}</td>

                      <td className="td text-muted">{timeAgo(sale.soldAt)}</td>

                    </tr>

                  ))}

                </tbody>

              </table>

              {!sales || sales.length === 0 && <EmptyState title="Продаж нет" />}

            </div>

          )}

        </Card>



        <Card

          title="Сезонность по часам"

          hint="Когда сделок больше всего. Полезно, чтобы покупать в тихие часы и выставлять в пиковые."

        >

          <div className="flex h-56 items-end gap-1">

            {(history?.seasonality ?? []).map((hour) => (

              <div key={hour.hour} className="group relative flex-1">

                <div

                  className="w-full rounded-t bg-success/50 group-hover:bg-success"

                  style={{ height: `${(hour.sales / maxSeason) * 190}px` }}

                />

                <div className="pointer-events-none absolute bottom-full left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#0d1626] px-2 py-1 text-xs group-hover:block">

                  {hour.hour}:00 · {hour.sales} сделок · {money(hour.median)}

                </div>

              </div>

            ))}

          </div>

          <div className="mt-2 flex justify-between text-[10px] text-muted">

            <span>00:00</span>

            <span>12:00</span>

            <span>23:00</span>

          </div>

        </Card>

      </motion.div>



      <motion.div 

        initial={{ opacity: 0, y: 10 }}

        animate={{ opacity: 1, y: 0 }}

        transition={{ delay: 0.4 }}

      >

        <Card title="Статистика цены">

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">

            {[

              ["Медиана", money(item.median ?? 0), "Устойчива к выбросам, основной ориентир."],

              ["Среднее", money(item.mean ?? 0), "Чувствительно к выбросам, показывается для сравнения."],

              ["Мода", money(item.mode ?? 0), "Самая частая цена в пределах 2% корзины."],

              ["Изм. 24 ч", "", ""],

              ["Изм. 7 д", "", ""],

              ["Сделок 24 ч", num(item.sales24h ?? 0), ""],

              ["Обновлено", timeAgo(item.updatedAt ?? ""), "Возраст последнего расчёта метрик."],

            ].map(([label, value, hint], index) => (

              <div key={label}>

                <div className="flex items-center gap-1">

                  <span className="stat-label">{label}</span>

                  {hint ? <Tooltip text={hint as string} /> : null}

                </div>

                <div className="num mt-1 text-lg">

                  {index === 3 ? (

                    <Delta value={item.change24h} />

                  ) : index === 4 ? (

                    <Delta value={item.change7d} />

                  ) : (

                    value

                  )}

                </div>

              </div>

            ))}

          </div>

        </Card>

      </motion.div>

    </div>

  );

}

