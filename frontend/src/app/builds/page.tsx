"use client";

import { useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import { Biohazard, Bomb, Brain, Bug, ChevronDown, Crosshair, Droplet, Flame, FlaskConical, Gauge, Heart, Package, Plus, Scissors, Scale, Shield, Snowflake, Target, Thermometer, TestTube, X, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { money, qualityColor, qualityToString } from "@/lib/format";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

const QUALITIES = ["Обычный", "Необычный", "Особый", "Редкий", "Исключительный", "Легендарный"];
const UPGRADE_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

const CONTAMINATION_MAP: Record<string, { icon: LucideIcon; label: string }> = {
  radiation: { icon: Biohazard, label: "Радиация" },
  biological: { icon: Bug, label: "Биология" },
  psychic: { icon: Brain, label: "Пси" },
  psycho: { icon: Brain, label: "Пси" },
  electro: { icon: Zap, label: "Электро" },
  electricity: { icon: Zap, label: "Электро" },
  thermal: { icon: Thermometer, label: "Терма" },
  bleeding: { icon: Droplet, label: "Кровотечение" },
  tear: { icon: Scissors, label: "Разрыв" },
  explosion: { icon: Flame, label: "Взрыв" },
  fire: { icon: Flame, label: "Огонь" },
  chemical: { icon: TestTube, label: "Химия" },
};

// Mapping artifact stat keys to contamination / stat keys
const ARTIFACT_STAT_MAP: Record<string, { target: string; label?: string; icon?: LucideIcon }> = {
  // Contamination - protection (positive)
  'biological_protection': { target: 'biological', label: 'Биозащита', icon: Bug },
  'radiation_protection': { target: 'radiation', label: 'Радиация', icon: Biohazard },
  'psycho_protection': { target: 'psycho', label: 'Пси-защита', icon: Brain },
  'thermal_protection': { target: 'thermal', label: 'Терма', icon: Thermometer },
  'bleeding_protection': { target: 'bleeding', label: 'Кровотечение', icon: Droplet },
  'frost_protection': { target: 'frost', label: 'Холод', icon: Snowflake },
  'fire_protection': { target: 'fire', label: 'Огонь', icon: Flame },

  // Contamination - accumulation (negative/harmful)
  'biological_accumulation': { target: 'biological', label: 'Биозаражение', icon: Bug },
  'radiation_accumulation': { target: 'radiation', label: 'Радиация', icon: Biohazard },
  'psycho_accumulation': { target: 'psycho', label: 'Пси-накопление', icon: Brain },
  'thermal_accumulation': { target: 'thermal', label: 'Терма-накопление', icon: Thermometer },
  'bleeding_accumulation': { target: 'bleeding', label: 'Кровотечение', icon: Droplet },
  'frost_accumulation': { target: 'frost', label: 'Холод-накопление', icon: Snowflake },
  'combustion_accumulation': { target: 'fire', label: 'Горение', icon: Flame },

  // Damage factors
  'burn_dmg_factor': { target: 'fire', label: 'Защита от огня', icon: Flame },
  'electra_dmg_factor': { target: 'electricity', label: 'Электрозащита', icon: Zap },
  'chemical_burn_dmg_factor': { target: 'chemical', label: 'Химзащита', icon: TestTube },
  'tear_dmg_factor': { target: 'tear', label: 'Защита от разрыва', icon: Scissors },
  'explosion_dmg_factor': { target: 'explosion', label: 'Защита от взрыва', icon: Bomb },

  // Other stats (English keys)
  'stamina_bonus': { target: 'stamina', label: 'Выносливость', icon: Zap },
  'stamina_regeneration_bonus': { target: 'stamina_regen', label: 'Восстановление выносливости', icon: Zap },
  'speed_modifier': { target: 'speed', label: 'Скорость', icon: Gauge },
  'sprint_speed_modifier': { target: 'sprint_speed', label: 'Скорость бега', icon: Gauge },
  'max_weight_bonus': { target: 'weight', label: 'Переносимый вес', icon: Package },
  'health_bonus': { target: 'health', label: 'Живучесть', icon: Shield },
  'regeneration_bonus': { target: 'regeneration', label: 'Регенерация', icon: FlaskConical },
  'heal_efficiency': { target: 'heal_efficiency', label: 'Эффективность лечения', icon: FlaskConical },
  'recoil_bonus': { target: 'recoil', label: 'Отдача', icon: Target },
  'wiggle_bonus': { target: 'wiggle', label: 'Покачивание', icon: Crosshair },
  'stopping_protection': { target: 'stability', label: 'Стойкость', icon: Shield },
  'periodic_heal': { target: 'periodic_heal', label: 'Периодическое лечение', icon: Heart },

  // Russian stat names from CSV
  'Живучесть': { target: 'health', label: 'Живучесть', icon: Shield },
  'Выносливость': { target: 'stamina', label: 'Выносливость', icon: Zap },
  'Восстановление выносливости': { target: 'stamina_regen', label: 'Восстановление выносливости', icon: Zap },
  'Скорость передвижения': { target: 'speed', label: 'Скорость', icon: Gauge },
  'Скорость бега': { target: 'sprint_speed', label: 'Скорость бега', icon: Gauge },
  'Переносимый вес': { target: 'weight', label: 'Переносимый вес', icon: Package },
  'Регенерация здоровья': { target: 'regeneration', label: 'Регенерация', icon: FlaskConical },
  'Эффективность лечения': { target: 'heal_efficiency', label: 'Эффективность лечения', icon: FlaskConical },
  'Отдача': { target: 'recoil', label: 'Отдача', icon: Target },
  'Покачивание': { target: 'wiggle', label: 'Покачивание', icon: Crosshair },
  'Стойкость': { target: 'stability', label: 'Стойкость', icon: Shield },
  'Пулестойкость': { target: 'bullet_resistance', label: 'Пулестойкость', icon: Shield },
  'Защита от взрыва': { target: 'explosion', label: 'Защита от взрыва', icon: Bomb },
  'Защита от разрыва': { target: 'tear', label: 'Защита от разрыва', icon: Scissors },
  'Реакция на электричество': { target: 'electricity', label: 'Электрозащита', icon: Zap },
  'Реакция на ожог': { target: 'fire', label: 'Защита от огня', icon: Flame },
  'Реакция на хим. ожог': { target: 'chemical', label: 'Химзащита', icon: TestTube },
  'Электрозащита': { target: 'electricity', label: 'Электрозащита', icon: Zap },
  'Температура': { target: 'thermal', label: 'Терма', icon: Thermometer },
  'Холод': { target: 'frost', label: 'Холод', icon: Snowflake },
  'Горение': { target: 'fire', label: 'Горение', icon: Flame },
  'Радиация': { target: 'radiation', label: 'Радиация', icon: Biohazard },
  'Биологическое заражение': { target: 'biological', label: 'Биозаражение', icon: Bug },
  'Пси-излучение': { target: 'psycho', label: 'Пси', icon: Brain },
  'Кровотечение': { target: 'bleeding', label: 'Кровотечение', icon: Droplet },
};

const ARMOR_CATEGORY_MAP: Record<string, string> = {
  clothes: "Гражданская",
  combat: "Боевая",
  combined: "Комбинированная",
  device: "Спецснаряжение",
  scientist: "Научная",
};

function splitItemName(name: string): { category: string; short: string } {
  const match = name.match(/«([^»]+)»/);
  if (!match) return { category: "", short: name.toUpperCase() };
  const quoted = match[1];
  const prefix = name.slice(0, match.index).trim();
  const words = prefix.split(/\s+/).filter(Boolean);
  const category = words.length > 0 ? words[words.length - 1].toUpperCase() : "";
  return { category, short: quoted.toUpperCase() };
}

function RadialGauge({ value, max, contaminationKey, isHighlighted }: { value: number; max: number; contaminationKey: string; isHighlighted?: boolean }) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const mapped = CONTAMINATION_MAP[contaminationKey] || { icon: null, label: contaminationKey };
  const IconComponent = mapped.icon;
  
  const getColor = () => {
    if (percentage < 60) return 'var(--builds-positive)';
    if (percentage < 90) return 'var(--builds-warning)';
    return 'var(--builds-negative)';
  };
  
  const color = getColor();
  
  return (
    <div className="flex flex-col items-center">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={radius} fill="none" stroke="var(--builds-border)" strokeWidth="2" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={isHighlighted ? 3 : 2}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 28 28)"
          style={{ transition: 'stroke-dashoffset 0.5s ease-out, stroke-width 0.2s ease-out' }}
          className={percentage >= 90 ? 'gauge-critical' : ''}
        />
        <text x="28" y="28" dy="0.3em" textAnchor="middle" fontSize="12" fill={color} style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
          {value}
        </text>
      </svg>
      <div className="text-[9px] mt-1 builds-text-muted flex items-center gap-1">
        {IconComponent && <IconComponent size={9} />}
        <span>{mapped.label}</span>
      </div>
    </div>
  );
}

function AnimatedCounter({ value }: { value: number }) {
  return <span>{value}</span>;
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <div className="w-1 h-4" style={{ backgroundColor: 'var(--builds-text-bright)' }} />
      <span className="text-xs tracking-wider" style={{ color: 'var(--builds-text-muted)', letterSpacing: '0.1em' }}>{children}</span>
    </div>
  );
}

interface Container {
  id: number;
  item_id: string;
  name_ru: string;
  icon?: string;
  slots: number;
  inner_protection: number;
  effectiveness: number;
}

interface Armor {
  id: number;
  item_id: string;
  name_ru: string;
  icon?: string;
  armor_type: string;
  weight: number;
  bullet_resistance: number;
  radiation_resistance: number;
  biological_resistance: number;
  psycho_resistance: number;
  electricity_resistance: number;
  thermal_resistance: number;
  chemical_resistance: number;
  bleeding_resistance: number;
  tear_resistance: number;
  explosion_resistance: number;
  fire_resistance: number;
  stamina_bonus: number;
  speed_modifier: number;
  carry_weight_bonus: number;
  stamina_regeneration_bonus?: number;
  sprint_speed_modifier?: number;
  health_bonus?: number;
  regeneration_bonus?: number;
  stability?: number;
}

interface Artifact {
  id: number;
  item_id: string;
  name: string;
  icon?: string;
  quality: string;
  marketPrice?: number;
  variants?: Array<{quality: string; upgradeLevel: number; marketPrice: number | null}>;
}

interface BuildItem {
  id: number;
  item_id: string;
  name: string;
  icon?: string;
  quality: number;
  upgrade_level: number;
  selectedRank?: string | null;
  selectedAdditionalStats?: string[];
}

interface ArtifactProperty {
  artifact_name: string;
  property_type: string;
  stat_name: string;
  unit: string;
  is_harmful: boolean;
  value_at_85: number;
  value_at_100: number;
  efficiency_affected: boolean;
  protection_affected: boolean;
}

export default function BuildsPage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [armor, setArmor] = useState<Armor[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [selectedArmor, setSelectedArmor] = useState<Armor | null>(null);
  const [buildItems, setBuildItems] = useState<BuildItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllContainers, setShowAllContainers] = useState(false);
  const [showAllArmor, setShowAllArmor] = useState(false);
  const [containerSearch, setContainerSearch] = useState("");
  const [armorSearch, setArmorSearch] = useState("");
  const [showArtifactSearch, setShowArtifactSearch] = useState(false);
  const [artifactSearch, artifactSearchSet] = useState("");
  const [searchResults, setSearchResults] = useState<Artifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<BuildItem | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<number>(100);
  const [selectedUpgradeLevel, setSelectedUpgradeLevel] = useState<number>(0);
  const [pendingArtifact, setPendingArtifact] = useState<Artifact | null>(null);
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);
  const [artifactStats, setArtifactStats] = useState<Record<string, any>>({});
  const [artifactProperties, setArtifactProperties] = useState<ArtifactProperty[]>([]);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [editQuality, setEditQuality] = useState<number>(100);
  const [editLevel, setEditLevel] = useState<number>(0);
  const [editSelectedRank, setEditSelectedRank] = useState<string | null>(null);
  const [editSelectedAdditionalStats, setEditSelectedAdditionalStats] = useState<Set<string>>(new Set());
  const [editShowAdditionalStats, setEditShowAdditionalStats] = useState<boolean>(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(Date.now());
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [tempQualityInput, setTempQualityInput] = useState<string>('');
  const [tempUpgradeInput, setTempUpgradeInput] = useState<string>('');
  const [showAdditionalStats, setShowAdditionalStats] = useState<boolean>(false);
  const [selectedAdditionalStats, setSelectedAdditionalStats] = useState<Set<string>>(new Set());
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [artifactVariants, setArtifactVariants] = useState<Record<string, Array<{quality: string; upgradeLevel: number; marketPrice: number | null}>>>({});

  const qualityToString = (quality: number): string => {
    if (quality <= 100) return 'Обычный';
    if (quality <= 115) return 'Необычный';
    if (quality <= 130) return 'Особый';
    if (quality <= 145) return 'Редкий';
    if (quality <= 160) return 'Исключительный';
    if (quality <= 175) return 'Легендарный';
    return 'Уникальный';
  };

  const stringQualityToNumber = (quality: string): number => {
    const map: Record<string, number> = {
      'Обычный': 100,
      'Необычный': 115,
      'Особый': 130,
      'Редкий': 145,
      'Исключительный': 160,
      'Легендарный': 175,
      'Уникальный': 190,
    };
    return map[quality] || 100;
  };

  const getArtifactPriceFromVariants = (variants: Array<{quality: string; upgradeLevel: number; marketPrice: number | null}> | undefined, quality: number, upgradeLevel: number): number | null => {
    if (!variants) return null;
    const qualityStr = qualityToString(quality);
    const matchingVariant = variants.find(v => 
      v.quality === qualityStr && 
      v.upgradeLevel === upgradeLevel
    );
    return matchingVariant?.marketPrice || null;
  };

  const totalCost = useMemo(() => {
    return buildItems.reduce((sum, item) => {
      const price = getArtifactPriceFromVariants(artifactVariants[item.item_id], item.quality, item.upgrade_level);
      return sum + (price || 0);
    }, 0);
  }, [buildItems, artifactVariants]);

  useEffect(() => {
    loadData();
  }, []);

  // Сбрасываем выбор дополнительных свойств только при смене артефакта на другой
  useEffect(() => {
    if (!pendingArtifact) {
      setSelectedAdditionalStats(new Set());
      setShowAdditionalStats(false);
    }
  }, [pendingArtifact?.item_id]);

  // Сохраняем варианты цен при выборе артефакта
  useEffect(() => {
    if (pendingArtifact && pendingArtifact.variants && pendingArtifact.item_id) {
      setArtifactVariants(prev => ({ ...prev, [pendingArtifact.item_id]: pendingArtifact.variants || [] }));
    }
  }, [pendingArtifact?.item_id]);

  // Загружаем варианты цен для всех артефактов в сборке при загрузке
  useEffect(() => {
    const loadAllVariants = async () => {
      const itemsToLoad = buildItems.filter(item => !artifactVariants[item.item_id]);
      if (itemsToLoad.length === 0) return;

      const promises = itemsToLoad.map(async (item) => {
        try {
          const result = await api(`/api/items/${item.item_id}`) as { variants: Array<{quality: string; upgradeLevel: number; marketPrice: number | null}> };
          return { item_id: item.item_id, variants: result.variants || [] };
        } catch (error) {
          console.error('Error loading variants for', item.item_id, ':', error);
          return { item_id: item.item_id, variants: [] };
        }
      });

      const results = await Promise.all(promises);
      results.forEach(({ item_id, variants }) => {
        setArtifactVariants(prev => ({ ...prev, [item_id]: variants }));
      });
    };

    loadAllVariants();
  }, [buildItems]);

  // Сбрасываем или устанавливаем selectedRank при изменении качества
  useEffect(() => {
    const boundaries = [100, 115, 130, 145, 160, 175];
    if (boundaries.includes(selectedQuality)) {
      // Если качество на границе, устанавливаем нижний ранг по умолчанию
      const boundaryRanks: Record<number, string> = {
        100: "Обычный",
        115: "Необычный",
        130: "Особый",
        145: "Редкий",
        160: "Исключительный",
        175: "Легендарный",
      };
      if (selectedRank !== boundaryRanks[selectedQuality]) {
        setSelectedRank(boundaryRanks[selectedQuality]);
      }
    } else {
      // Если качество не на границе, сбрасываем ранг
      setSelectedRank(null);
    }
  }, [selectedQuality]);

  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setLastUpdatedAt(Date.now());
  }, [selectedContainer, selectedArmor, buildItems]);

  useEffect(() => {
    loadData();
    loadArtifactProperties();
  }, []);

  const loadData = async () => {
    try {
      const [containersData, armorData] = await Promise.all([
        api('/api/containers'),
        api('/api/armor')
      ]);
      setContainers(containersData as Container[]);
      setArmor(armorData as Armor[]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadArtifactProperties = async () => {
    try {
      const response = await fetch('/artifact_properties.csv');
      const text = await response.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      const properties: ArtifactProperty[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',');
        properties.push({
          artifact_name: values[0],
          property_type: values[1],
          stat_name: values[2],
          unit: values[3],
          is_harmful: values[4] === 'TRUE',
          value_at_85: parseFloat(values[5]),
          value_at_100: parseFloat(values[6]),
          efficiency_affected: values[7] === 'TRUE',
          protection_affected: values[8] === 'TRUE',
        });
      }

      setArtifactProperties(properties);
    } catch (error) {
      console.error('Error loading artifact properties:', error);
    }
  };

  // Artifact calculation functions
  const getEffectiveQuality = (quality: number, rank: string | null, isHarmful: boolean) => {
    if (!isHarmful) return quality; // положительные — всегда от quality

    const boundaries = [100, 115, 130, 145, 160, 175];
    const upperRanks: Record<number, string> = {
      100: "Необычный",
      115: "Особый",
      130: "Редкий",
      145: "Исключительный",
      160: "Легендарный",
      175: "Уникальный"
    };

    // Если качество на границе и выбран верхний ранг → effectiveQuality = 85
    if (boundaries.includes(quality) && rank === upperRanks[quality]) {
      return 85;
    }

    // Иначе effectiveQuality = quality
    return quality;
  };

  const calcValueAtQuality0 = (prop: ArtifactProperty, quality: number, effectiveQuality: number) => {
    const { value_at_85, value_at_100, is_harmful } = prop;

    if (!is_harmful) {
      return value_at_100 * (quality / 100);
    } else {
      if (effectiveQuality <= 100) {
        const value0 = - (Math.abs(value_at_100) * effectiveQuality / 100);
        return value0;
      } else {
        // сброс с использованием min = value_at_85 * 86/85
        const base = Math.abs(value_at_100);
        const min = Math.abs(value_at_85) * (86 / 85);
        const rank = Math.floor((effectiveQuality - 101) / 15);
        const start = 101 + rank * 15;
        const t = (effectiveQuality - start) / 14;
        const raw = min + (base - min) * t;
        const value0 = -raw;
        return value0;
      }
    }
  };

  const applyUpgrade = (valueAtQ0: number, isHarmful: boolean, level: number) => {
    if (isHarmful) {
      return valueAtQ0;
    } else {
      return valueAtQ0 * (1 + 0.02 * level);
    }
  };

  const calcFinal = (prop: ArtifactProperty, quality: number, level: number, selectedRank: string | null) => {
    const effectiveQuality = getEffectiveQuality(quality, selectedRank, prop.is_harmful);
    const val0 = calcValueAtQuality0(prop, quality, effectiveQuality);
    const final = applyUpgrade(val0, prop.is_harmful, level);
    return parseFloat(final.toFixed(2));
  };

  const getArtifactProperties = (artifactName: string, quality: number, level: number, selectedRank: string | null) => {
    // Сначала пробуем точное совпадение
    let properties = artifactProperties.filter(p => p.artifact_name === artifactName);

    // Если не найдено, пробуем нечёткое сравнение
    if (properties.length === 0) {
      const csvNames = Array.from(new Set(artifactProperties.map(p => p.artifact_name)));
      const lowerArtifactName = artifactName.toLowerCase();

      // Ищем название, которое содержит часть названия артефакта или наоборот
      const matchedName = csvNames.find(csvName => {
        const lowerCsvName = csvName.toLowerCase();
        return lowerCsvName.includes(lowerArtifactName) || lowerArtifactName.includes(lowerCsvName);
      });

      if (matchedName) {
        properties = artifactProperties.filter(p => p.artifact_name === matchedName);
        console.log('Fuzzy match:', { original: artifactName, matched: matchedName });
      }
    }

    console.log('getArtifactProperties:', { artifactName, propertiesCount: properties.length, totalProperties: artifactProperties.length });
    if (properties.length === 0) {
      console.log('Available artifact names:', Array.from(new Set(artifactProperties.map(p => p.artifact_name))).slice(0, 20));
    }
    return properties.map(prop => ({
      ...prop,
      finalValue: calcFinal(prop, quality, level, selectedRank),
    }));
  };

  const openEditSlot = (index: number) => {
    const item = buildItems[index];
    if (item) {
      setEditingSlotIndex(index);
      setEditQuality(qualityToNumber(item.quality));
      setEditLevel(item.upgrade_level);
      setEditSelectedRank(item.selectedRank ?? null);
      setEditSelectedAdditionalStats(new Set(item.selectedAdditionalStats || []));
    }
  };

  const closeEditSlot = () => {
    setEditingSlotIndex(null);
  };

  const saveEditSlot = () => {
    if (editingSlotIndex !== null) {
      const item = buildItems[editingSlotIndex];
      const updatedItem = {
        ...item,
        quality: editQuality,
        upgrade_level: editLevel,
        selectedRank: editSelectedRank,
        selectedAdditionalStats: Array.from(editSelectedAdditionalStats),
      };
      setBuildItems(buildItems.map((i, idx) => idx === editingSlotIndex ? updatedItem : i));
      closeEditSlot();
    }
  };

  const qualityToNumber = (quality: number): number => {
    return quality;
  };

  const numberToQuality = (number: number): number => {
    return number;
  };

  const searchArtifacts = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await api(`/api/catalog?search=${query}&limit=20`) as { items: Artifact[] };
      setSearchResults(results.items || []);
    } catch (error) {
      console.error('Error searching artifacts:', error);
    }
  };

  const addArtifact = (artifact: Artifact, quality?: number, upgradeLevel?: number) => {
    if (!selectedContainer || buildItems.length >= selectedContainer.slots) return;

    // Сохраняем варианты цен при добавлении артефакта
    if (artifact.variants && artifact.item_id) {
      setArtifactVariants(prev => ({ ...prev, [artifact.item_id]: artifact.variants || [] }));
    }

    const newItem: BuildItem = {
      id: Date.now(),
      item_id: artifact.item_id,
      name: artifact.name,
      icon: artifact.icon,
      quality: quality || stringQualityToNumber(artifact.quality),
      upgrade_level: upgradeLevel ?? 0,
      selectedRank: selectedRank,
      selectedAdditionalStats: Array.from(selectedAdditionalStats),
    };
    setBuildItems([...buildItems, newItem]);
    setShowArtifactSearch(false);
    setActiveSlotIndex(null);
    setPendingArtifact(null);
    artifactSearchSet('');
    setSearchResults([]);
    setSelectedQuality(100);
    setSelectedUpgradeLevel(0);
    setSelectedRank(null);
    setSelectedAdditionalStats(new Set());

    loadArtifactStats(artifact.item_id);
  };

  const loadArtifactStats = async (item_id: string) => {
    try {
      const stats = await api(`/api/artifacts/${item_id}/stats`);
      setArtifactStats(prev => ({ ...prev, [item_id]: stats }));
    } catch (error) {
      console.error('Error loading artifact stats:', error);
    }
  };

  useEffect(() => {
    buildItems.forEach(item => {
      if (!artifactStats[item.item_id]) {
        loadArtifactStats(item.item_id);
      }
    });
  }, [buildItems]);


  const removeArtifact = (item_id: string) => {
    setBuildItems(buildItems.filter(item => item.item_id !== item_id));
    if (selectedArtifact?.item_id === item_id) {
      setSelectedArtifact(null);
    }
  };

  const artifactTotals = useMemo(() => {
    const totals: Record<string, { value: number; label: string; icon?: LucideIcon; isHarmful: boolean; unit: string; efficiency_affected: boolean; protection_affected: boolean }> = {};

    buildItems.forEach(item => {
      // Получаем свойства артефакта из CSV данных
      const properties = artifactProperties.filter(p => p.artifact_name === item.name);

      // Если не найдено точное совпадение, пробуем нечёткое сравнение
      let matchedProperties = properties;
      if (matchedProperties.length === 0) {
        const csvNames = Array.from(new Set(artifactProperties.map(p => p.artifact_name)));
        const lowerArtifactName = item.name.toLowerCase();

        const matchedName = csvNames.find(csvName => {
          const lowerCsvName = csvName.toLowerCase();
          return lowerCsvName.includes(lowerArtifactName) || lowerArtifactName.includes(lowerCsvName);
        });

        if (matchedName) {
          matchedProperties = artifactProperties.filter(p => p.artifact_name === matchedName);
        }
      }

      // Используем сохранённый selectedRank из BuildItem
      matchedProperties.forEach(prop => {
        // Пропускаем дополнительные статы, если они не выбраны
        if (prop.property_type === 'Дополнительное' && item.selectedAdditionalStats && !item.selectedAdditionalStats.includes(prop.stat_name)) {
          return;
        }

        const key = prop.stat_name;
        const finalValue = calcFinal(prop, item.quality, item.upgrade_level, item.selectedRank ?? null);
        const isHarmful = prop.is_harmful;
        const unit = prop.unit;

        if (!key || !ARTIFACT_STAT_MAP[key]) return;

        const mapping = ARTIFACT_STAT_MAP[key];
        if (!totals[mapping.target]) {
          totals[mapping.target] = { value: 0, label: mapping.label || mapping.target, icon: mapping.icon, isHarmful: false, unit: unit, efficiency_affected: prop.efficiency_affected, protection_affected: prop.protection_affected };
        }

        totals[mapping.target].value += finalValue;
        if (isHarmful) totals[mapping.target].isHarmful = true;
      });
    });

    return totals;
  }, [buildItems, artifactProperties]);

  const calculateTotalStats = () => {
    if (!selectedArmor || !selectedContainer) return null;
    
    const containerBonus = selectedContainer.inner_protection * selectedContainer.effectiveness / 100;
    
    // All contamination/defense stats
    const armorProtection = {
      radiation: selectedArmor.radiation_resistance + (artifactTotals['radiation']?.value || 0) + containerBonus,
      biological: selectedArmor.biological_resistance + (artifactTotals['biological']?.value || 0) + containerBonus,
      psycho: selectedArmor.psycho_resistance + (artifactTotals['psycho']?.value || 0) + containerBonus,
      electricity: selectedArmor.electricity_resistance + (artifactTotals['electricity']?.value || 0) + containerBonus,
      thermal: selectedArmor.thermal_resistance + (artifactTotals['thermal']?.value || 0) + containerBonus,
      chemical: selectedArmor.chemical_resistance + (artifactTotals['chemical']?.value || 0) + containerBonus,
      bleeding: selectedArmor.bleeding_resistance + (artifactTotals['bleeding']?.value || 0) + containerBonus,
      tear: selectedArmor.tear_resistance + (artifactTotals['tear']?.value || 0) + containerBonus,
      explosion: selectedArmor.explosion_resistance + (artifactTotals['explosion']?.value || 0) + containerBonus,
      fire: selectedArmor.fire_resistance + (artifactTotals['fire']?.value || 0) + containerBonus,
    };
    
    // Other stats
    const otherStats = {
      stamina: selectedArmor.stamina_bonus + (artifactTotals['stamina']?.value || 0),
      stamina_regen: (selectedArmor.stamina_regeneration_bonus || 0) + (artifactTotals['stamina_regen']?.value || 0),
      speed: selectedArmor.speed_modifier + (artifactTotals['speed']?.value || 0),
      sprint_speed: (selectedArmor.sprint_speed_modifier || 0) + (artifactTotals['sprint_speed']?.value || 0),
      weight: selectedArmor.carry_weight_bonus + (artifactTotals['weight']?.value || 0),
      health: (selectedArmor.health_bonus || 0) + (artifactTotals['health']?.value || 0),
      regeneration: (selectedArmor.regeneration_bonus || 0) + (artifactTotals['regeneration']?.value || 0),
      heal_efficiency: (artifactTotals['heal_efficiency']?.value || 0),
      recoil: (artifactTotals['recoil']?.value || 0),
      wiggle: (artifactTotals['wiggle']?.value || 0),
      stability: (selectedArmor.stability || 0) + (artifactTotals['stability']?.value || 0),
      periodic_heal: (artifactTotals['periodic_heal']?.value || 0),
    };
    
    return {
      armorProtection,
      containerBonus,
      otherStats,
    };
  };

  const balance = calculateTotalStats();
  const prefersReducedMotion = useReducedMotion();
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) {
      setBooted(true);
      return;
    }
    const t = setTimeout(() => setBooted(true), 2200);
    return () => clearTimeout(t);
  }, [prefersReducedMotion]);

  return (
    <div className="w-full">
      <div 
        className="flex flex-col gap-4 pb-4 min-h-screen builds-page mx-auto relative"
        style={{ 
          backgroundColor: 'var(--builds-bg)',
          color: 'var(--builds-text)',
          maxWidth: '1900px',
          paddingLeft: '2rem',
          paddingRight: '2rem'
        }}
      >
        {/* Boot screen */}
        {!booted && (
          <div className="pda-boot-screen">
            <div className="scan-line" />
            <div className="text-xs tracking-widest mb-2" style={{ animation: 'pda-boot-in 1.2s ease-out forwards' }}>
              SZINSIGHT SYSTEMS
            </div>
            <div className="text-[10px] builds-text-muted" style={{ animation: 'pda-boot-in 1.4s ease-out forwards' }}>
              INITIALIZING PDA MODULE...
            </div>
            <div className="mt-4 w-48 h-1 rounded bg-black/40 overflow-hidden">
              <motion.div
                className="h-full rounded"
                style={{ backgroundColor: 'var(--builds-accent)' }}
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.8, ease: 'easeInOut' }}
              />
            </div>
            <div className="mt-2 text-[10px] builds-text-muted font-mono-builds">
              <span style={{ animation: 'pda-cursor 1s steps(1) infinite' }}>_</span>
            </div>
          </div>
        )}

        {/* Scanline on page entry */}
        {!prefersReducedMotion && (
          <motion.div
            initial={{ top: 0, opacity: 1 }}
            animate={{ top: '100%', opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--builds-accent)] to-transparent z-50 pointer-events-none"
            style={{ boxShadow: '0 0 20px var(--builds-accent)' }}
          />
        )}

        {/* Combined overlay — full-screen fixed via portal */}
        {booted && createPortal(
          <div
            aria-hidden="true"
            className="pointer-events-none"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 41,
              background:
                'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.55) 100%), repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 2px)',
            }}
          />,
          document.body
        )}

        {/* Заголовок */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 builds-card artifact-search-panel">
          <div className="corner-bracket tl" />
          <div className="corner-bracket tr" />
          <div className="corner-bracket bl" />
          <div className="corner-bracket br" />
          <div>
            <h1 className="text-xl font-bold tracking-tight builds-text-bright" style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.02em' }}>КАЛЬКУЛЯТОР СБОРОК</h1>
          </div>
          {(selectedContainer || selectedArmor) && (
            <div className="text-right">
              <div className="text-xs builds-text-muted">СТОИМОСТЬ СБОРКИ</div>
              <div className="text-lg font-bold font-mono-builds">
                <AnimatedCounter value={totalCost} /> ₽
              </div>
            </div>
          )}
        </div>

        {/* Основной контент - адаптивные колонки */}
        <div className="flex flex-col xl:grid xl:grid-cols-3 gap-4 px-4 flex-1">
          {/* Левая колонка - ЭКИПИРОВКА */}
          <div className="flex flex-col gap-3">
            <SectionHeader>ЭКИПИРОВКА</SectionHeader>
            
            {/* Селектор контейнеров */}
            <div className="overflow-hidden builds-card artifact-search-panel">
              <div className="corner-bracket tl" />
              <div className="corner-bracket tr" />
              <div className="corner-bracket bl" />
              <div className="corner-bracket br" />
              {!showAllContainers ? (
                <button
                  onClick={() => setShowAllContainers(true)}
                  className="w-full h-[100px] flex items-center gap-3 p-3 transition-all hover:builds-accent-border"
                  style={{ border: 'none', background: 'transparent' }}
                >
                  {selectedContainer ? (
                    <>
                      {selectedContainer.icon && (
                        <div className="builds-icon-cell">
                          <img src={selectedContainer.icon} alt="" style={{ width: 48, height: 60, objectFit: 'contain' }} />
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        {(() => {
                          const { category, short } = splitItemName(selectedContainer.name_ru);
                          return (
                            <>
                              {category && <div className="text-[10px] tracking-wider builds-text-muted">{category}</div>}
                              <div className="text-sm font-bold builds-text-bright">«{short}»</div>
                            </>
                          );
                        })()}
                        <div className="text-xs builds-text-muted mt-0.5">
                          <span className="font-mono-builds">{selectedContainer.slots}</span> слотов&nbsp;&nbsp;<Shield size={12} className="inline -mt-0.5" /> <span className="font-mono-builds">{selectedContainer.inner_protection.toFixed(0)}%</span>&nbsp;&nbsp;<Zap size={12} className="inline -mt-0.5" /> <span className="font-mono-builds">{selectedContainer.effectiveness.toFixed(0)}%</span>
                        </div>
                      </div>
                      <ChevronDown size={16} className="builds-text-muted" />
                    </>
                  ) : (
                    <>
                      <div className="builds-icon-cell">
                        <Package size={24} className="builds-text-muted" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-sm">Выбрать контейнер</div>
                        <div className="text-xs builds-text-muted">Слоты, защита, эффективность</div>
                      </div>
                      <ChevronDown size={16} className="builds-text-muted" />
                    </>
                  )}
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between p-3 border-b builds-card">
                    <span className="font-semibold text-sm">КОНТЕЙНЕРЫ</span>
                    <button onClick={() => setShowAllContainers(false)} className="text-white bg-transparent border-none cursor-pointer">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                    {containers.map((container) => (
                      <button
                        key={container.id}
                        onClick={() => { setSelectedContainer(container); setShowAllContainers(false); }}
                        className={`w-full p-2 rounded flex items-center gap-2 text-left transition-all border ${selectedContainer?.id === container.id ? 'border-[var(--builds-text-bright)]' : 'builds-card'}`}
                        style={selectedContainer?.id === container.id ? { backgroundColor: 'rgba(143,217,143,0.1)' } : {}}
                      >
                        {container.icon && <img src={container.icon} alt="" className="w-8 h-8 rounded" />}
                        <div className="flex-1">
                          <div className="font-semibold text-xs">{container.name_ru}</div>
                          <div className="text-[10px] builds-text-muted"><span className="font-mono-builds">{container.slots}</span> сл • <span className="font-mono-builds">{container.inner_protection.toFixed(0)}%</span> • <span className="font-mono-builds">{container.effectiveness.toFixed(0)}%</span></div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Селектор брони */}
            <div className="overflow-hidden builds-card artifact-search-panel">
              <div className="corner-bracket tl" />
              <div className="corner-bracket tr" />
              <div className="corner-bracket bl" />
              <div className="corner-bracket br" />
              {!showAllArmor ? (
                <button
                  onClick={() => setShowAllArmor(true)}
                  className="w-full h-[100px] flex items-center gap-3 p-3 transition-all hover:builds-accent-border"
                  style={{ border: 'none', background: 'transparent' }}
                >
                  {selectedArmor ? (
                    <>
                      {selectedArmor.icon && (
                        <div className="builds-icon-cell">
                          <img src={selectedArmor.icon} alt="" style={{ width: 48, height: 60, objectFit: 'contain' }} />
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        {(() => {
                          const { category, short } = splitItemName(selectedArmor.name_ru);
                          return (
                            <>
                              {category && <div className="text-[10px] tracking-wider builds-text-muted">{category}</div>}
                              <div className="text-sm font-bold builds-text-bright">«{short}»</div>
                            </>
                          );
                        })()}
                        <div className="text-xs builds-text-muted flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1"><Shield size={12} /><span className="font-mono-builds">{selectedArmor.bullet_resistance}</span></span>
                          <span className="flex items-center gap-1"><Scale size={12} /><span className="font-mono-builds">{selectedArmor.weight}</span> кг</span>
                        </div>
                      </div>
                      <ChevronDown size={16} className="builds-text-muted" />
                    </>
                  ) : (
                    <>
                      <div className="builds-icon-cell">
                        <Shield size={24} className="builds-text-muted" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-sm">Выбрать броню</div>
                        <div className="text-xs builds-text-muted">Защита от заражения</div>
                      </div>
                      <ChevronDown size={16} className="builds-text-muted" />
                    </>
                  )}
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center justify-between p-3 border-b builds-card">
                    <span className="font-semibold text-sm">БРОНЯ</span>
                    <button onClick={() => { setShowAllArmor(false); setArmorSearch(''); }} className="text-white bg-transparent border-none cursor-pointer">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="p-3 space-y-2">
                    <input
                      className="w-full px-3 py-2 text-xs rounded"
                      style={{ backgroundColor: '#1A211C', border: '1px solid #1A211C', color: '#E8ECE8' }}
                      placeholder="Поиск брони..."
                      value={armorSearch}
                      onChange={(e) => setArmorSearch(e.target.value)}
                      autoFocus
                    />
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {armor.filter(armorItem =>
                        armorItem.name_ru.toLowerCase().includes(armorSearch.toLowerCase()) ||
                        (ARMOR_CATEGORY_MAP[armorItem.armor_type] || armorItem.armor_type).toLowerCase().includes(armorSearch.toLowerCase())
                      ).map((armorItem) => (
                        <button
                          key={armorItem.id}
                          onClick={() => { setSelectedArmor(armorItem); setShowAllArmor(false); setArmorSearch(''); }}
                          className={`w-full p-2 rounded flex items-center gap-2 text-left transition-all border ${selectedArmor?.id === armorItem.id ? 'border-[var(--builds-text-bright)]' : 'builds-card'}`}
                          style={selectedArmor?.id === armorItem.id ? { backgroundColor: 'rgba(143,217,143,0.1)' } : {}}
                        >
                          {armorItem.icon && <img src={armorItem.icon} alt="" className="w-8 h-8 rounded" />}
                          <div className="flex-1">
                            <div className="font-semibold text-xs">{armorItem.name_ru}</div>
                            <div className="text-[10px] builds-text-muted flex items-center gap-2">
                              <span className="flex items-center gap-1"><Shield size={10} /><span className="font-mono-builds">{armorItem.bullet_resistance}</span></span> • {ARMOR_CATEGORY_MAP[armorItem.armor_type] || armorItem.armor_type}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Защита брони */}
            {selectedArmor && (
              <div className="p-3 builds-card artifact-search-panel">
                <div className="corner-bracket tl" />
                <div className="corner-bracket tr" />
                <div className="corner-bracket bl" />
                <div className="corner-bracket br" />
                <div className="text-xs font-semibold mb-2 builds-text-muted">ЗАЩИТА БРОНИ</div>
                <div className="space-y-1">
                  {selectedArmor.radiation_resistance > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="builds-text-muted flex items-center gap-1.5"><Biohazard size={12} /> Радиация</span>
                      <span className="font-mono-builds builds-positive">{selectedArmor.radiation_resistance}</span>
                    </div>
                  )}
                  {selectedArmor.biological_resistance > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="builds-text-muted flex items-center gap-1.5"><Bug size={12} /> Биология</span>
                      <span className="font-mono-builds builds-positive">{selectedArmor.biological_resistance}</span>
                    </div>
                  )}
                  {selectedArmor.psycho_resistance > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="builds-text-muted flex items-center gap-1.5"><Brain size={12} /> Пси</span>
                      <span className="font-mono-builds builds-positive">{selectedArmor.psycho_resistance}</span>
                    </div>
                  )}
                  {selectedArmor.electricity_resistance > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="builds-text-muted flex items-center gap-1.5"><Zap size={12} /> Электро</span>
                      <span className="font-mono-builds builds-positive">{selectedArmor.electricity_resistance}</span>
                    </div>
                  )}
                  {selectedArmor.thermal_resistance > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="builds-text-muted flex items-center gap-1.5"><Thermometer size={12} /> Терма</span>
                      <span className="font-mono-builds builds-positive">{selectedArmor.thermal_resistance}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Панель выбора артефакта — в левой колонке, под Защитой брони */}
            {selectedContainer && (
              <div className="p-3 builds-card artifact-search-panel">
                <SectionHeader>
                  {activeSlotIndex !== null && buildItems[activeSlotIndex] ? 'РЕДАКТИРОВАНИЕ АРТЕФАКТА' : 'ВЫБЕРИТЕ АРТЕФАКТ ДЛЯ СЛОТА'}
                </SectionHeader>
                <div className="flex gap-3">
                  {/* Левая часть — превью / качество / заточка — сужена */}
                  <div className="p-2 min-h-[160px] flex flex-col w-full sm:w-auto" style={{ flexBasis: '35%' }}>
                    {!pendingArtifact ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ border: '1px dashed var(--builds-border)' }}>
                          <Package size={18} className="builds-text-muted" />
                        </div>
                        {activeSlotIndex === null ? (
                          <>
                            <div className="text-xs">Выберите свободный слот</div>
                            <div className="text-[10px] builds-text-muted">Нажмите на слот в схеме</div>
                          </>
                        ) : (
                          <>
                            <div className="text-xs">Выберите артефакт из списка</div>
                            <div className="text-[10px] builds-text-muted">Найдите и нажмите на него</div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {pendingArtifact.icon && <img src={pendingArtifact.icon} alt="" className="w-8 h-8 rounded" />}
                          <div className="flex-1">
                            <div className="text-xs font-semibold" style={{ color: qualityColor(qualityToString(selectedQuality)) }}>{pendingArtifact.name}</div>
                            <div className="text-[10px] builds-text-muted">
                              {(() => {
                                const price = getArtifactPriceFromVariants(pendingArtifact.variants, selectedQuality, selectedUpgradeLevel);
                                return price ? money(price) : 'НЕТ ДАННЫХ';
                              })()}
                            </div>
                          </div>
                          <button onClick={() => { setPendingArtifact(null); setSelectedQuality(100); setSelectedUpgradeLevel(0); setActiveSlotIndex(null); setSelectedRank(null); setSelectedAdditionalStats(new Set()); setShowAdditionalStats(false); }} className="text-current bg-transparent border-none cursor-pointer builds-text-muted">
                            <X size={12} />
                          </button>
                        </div>

                        {/* Выбор качества */}
                        <div>
                          <div className="text-[10px] builds-text-muted mb-1">Качество:</div>
                          <div className="flex flex-wrap gap-1">
                            {[100, 115, 130, 145, 160, 175].map((quality) => (
                              <button
                                key={quality}
                                onClick={() => setSelectedQuality(quality)}
                                className={clsx(
                                  "px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all border",
                                  selectedQuality === quality
                                    ? "border-[var(--builds-text-bright)]"
                                    : "builds-card border-white/10"
                                )}
                                style={selectedQuality === quality ? {
                                  backgroundColor: qualityColor(qualityToString(quality)),
                                  color: '#0A0D0B'
                                } : {}}
                              >
                                {quality}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={tempQualityInput}
                              placeholder={selectedQuality.toString()}
                              onChange={(e) => setTempQualityInput(e.target.value)}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= 85 && val <= 190) {
                                  setSelectedQuality(val);
                                }
                                setTempQualityInput('');
                              }}
                              className="w-16 px-2 py-0.5 rounded text-[10px] font-mono builds-card border border-white/10 bg-transparent"
                              style={{ color: qualityColor(qualityToString(selectedQuality)) }}
                            />
                            <span className="text-[10px] builds-text-muted">%</span>
                          </div>
                          {/* Выбор ранга на граничных значениях */}
                          {[100, 115, 130, 145, 160, 175].includes(selectedQuality) && (
                            <div className="mt-2">
                              <div className="text-[10px] builds-text-muted mb-1">Ранг:</div>
                              <div className="flex gap-1">
                                {(() => {
                                  const boundaries: Record<number, { lower: string; upper: string }> = {
                                    100: { lower: "Обычный", upper: "Необычный" },
                                    115: { lower: "Необычный", upper: "Особый" },
                                    130: { lower: "Особый", upper: "Редкий" },
                                    145: { lower: "Редкий", upper: "Исключительный" },
                                    160: { lower: "Исключительный", upper: "Легендарный" },
                                    175: { lower: "Легендарный", upper: "Уникальный" },
                                  };
                                  const { lower, upper } = boundaries[selectedQuality];
                                  return [lower, upper].map((rank) => (
                                    <button
                                      key={rank}
                                      onClick={() => setSelectedRank(rank)}
                                      className={clsx(
                                        "px-2 py-0.5 rounded text-[10px] font-semibold transition-all border",
                                        selectedRank === rank
                                          ? "border-[var(--builds-text-bright)]"
                                          : "builds-card border-white/10"
                                      )}
                                      style={selectedRank === rank ? {
                                        backgroundColor: qualityColor(rank),
                                        color: '#0A0D0B'
                                      } : {}}
                                    >
                                      {rank}
                                    </button>
                                  ));
                                })()}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Выбор заточки */}
                        <div>
                          <div className="text-[10px] builds-text-muted mb-1">Заточка:</div>
                          <div className="flex flex-wrap gap-1">
                            {[0, 5, 10, 15].map((upgrade) => (
                              <button
                                key={upgrade}
                                onClick={() => setSelectedUpgradeLevel(upgrade)}
                                className={clsx(
                                  "px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all border",
                                  selectedUpgradeLevel === upgrade
                                    ? "border-[var(--builds-text-bright)]"
                                    : "builds-card border-white/10"
                                )}
                                style={selectedUpgradeLevel === upgrade ? {
                                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                  color: '#ffffff'
                                } : {}}
                              >
                                {upgrade === 0 ? "0" : `+${upgrade}`}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={tempUpgradeInput}
                              placeholder={selectedUpgradeLevel.toString()}
                              onChange={(e) => setTempUpgradeInput(e.target.value)}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= 0 && val <= 15) {
                                  setSelectedUpgradeLevel(val);
                                }
                                setTempUpgradeInput('');
                              }}
                              className="w-16 px-2 py-0.5 rounded text-[10px] font-mono builds-card border border-white/10 bg-transparent"
                              style={{ color: qualityColor(qualityToString(selectedQuality)) }}
                            />
                            <span className="text-[10px] builds-text-muted">ур.</span>
                          </div>
                        </div>

                        {/* Кнопка добавления/сохранения */}
                        {selectedQuality && (
                          <button
                            onClick={() => {
                              if (activeSlotIndex !== null && buildItems[activeSlotIndex]) {
                                // Редактирование существующего артефакта в слоте
                                setBuildItems(buildItems.map((item, idx) =>
                                  idx === activeSlotIndex
                                    ? { ...item, quality: selectedQuality, upgrade_level: selectedUpgradeLevel, selectedRank: selectedRank, selectedAdditionalStats: Array.from(selectedAdditionalStats) }
                                    : item
                                ));
                              } else {
                                // Добавление нового артефакта
                                addArtifact(pendingArtifact, selectedQuality, selectedUpgradeLevel);
                              }
                              setPendingArtifact(null);
                              setSelectedQuality(100);
                              setSelectedUpgradeLevel(0);
                              setActiveSlotIndex(null);
                              setSelectedRank(null);
                              setSelectedAdditionalStats(new Set());
                            }}
                            className="w-full py-1.5 rounded text-[10px] font-semibold transition-all"
                            style={{ backgroundColor: qualityColor(qualityToString(selectedQuality)), color: '#0A0D0B' }}
                          >
                            {activeSlotIndex !== null && buildItems[activeSlotIndex] ? 'Сохранить' : 'Добавить в сборку'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Правая часть — поиск и список результатов */}
                  <div className="p-2 min-h-[160px] flex flex-col w-full" style={{ flex: 1 }}>
                    {activeSlotIndex === null ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center gap-1">
                        <div className="text-xs">НЕТ АРТЕФАКТОВ</div>
                        <div className="text-[10px] builds-text-muted">Выберите слот и откройте список</div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 flex-1">
                        <input className="artifact-search-input w-full" placeholder="Поиск артефактов..." value={artifactSearch} onChange={(e) => { artifactSearchSet(e.target.value); searchArtifacts(e.target.value); }} autoFocus />
                        {!pendingArtifact || artifactSearch.length > 0 ? (
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {searchResults.length === 0 ? (
                              <div className="text-[10px] builds-text-muted text-center py-4">
                                {artifactSearch ? "Ничего не найдено" : "Начните вводить название"}
                              </div>
                            ) : (
                              searchResults.map((artifact) => (
                                <button key={artifact.id} onClick={() => { 
                                  console.log('Artifact clicked:', artifact);
                                  setPendingArtifact(artifact); 
                                  artifactSearchSet(''); 
                                }} className={`artifact-item w-full ${pendingArtifact?.item_id === artifact.item_id ? 'selected' : ''}`}>
                                  <div className="flex items-center gap-2">
                                    {artifact.icon && <img src={artifact.icon} alt="" className="w-5 h-5 rounded" />}
                                    <div className="flex-1">
                                      <div className="text-[10px]">{artifact.name}</div>
                                    </div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        ) : (
                          <>
                            {/* Свойства выбранного артефакта */}
                            {pendingArtifact && (
                              <div className="mt-2 space-y-1 border-t pt-2" style={{ borderColor: 'var(--builds-border)' }}>
                                {(() => {
                                  const displayQuality = selectedQuality || 100;
                                  const allProperties = getArtifactProperties(pendingArtifact.name, displayQuality, selectedUpgradeLevel, selectedRank);
                                  const mainProperties = allProperties.filter(p => p.property_type === 'Основное');
                                  const additionalProperties = allProperties.filter(p => p.property_type === 'Дополнительное');

                                  // Определяем максимальное количество выбранных свойств
                                  let maxSelected = 0;
                                  if (pendingArtifact.name === 'Рубик') {
                                    maxSelected = additionalProperties.length;
                                  } else {
                                    if (selectedUpgradeLevel >= 15) {
                                      maxSelected = 3;
                                    } else if (selectedUpgradeLevel >= 10) {
                                      maxSelected = 2;
                                    } else if (selectedUpgradeLevel >= 5) {
                                      maxSelected = 1;
                                    }
                                  }

                                  // Получаем выбранные дополнительные свойства
                                  const selectedAdditionalProperties = additionalProperties.filter(prop => selectedAdditionalStats.has(prop.stat_name));

                                  // Суммируем только выбранные дополнительные свойства с основными
                                  const mergedProperties = [...mainProperties];
                                  selectedAdditionalProperties.forEach(addProp => {
                                    const existingIndex = mergedProperties.findIndex(p => p.stat_name === addProp.stat_name);
                                    if (existingIndex !== -1) {
                                      mergedProperties[existingIndex] = {
                                        ...mergedProperties[existingIndex],
                                        finalValue: parseFloat((mergedProperties[existingIndex].finalValue + addProp.finalValue).toFixed(2))
                                      };
                                    } else {
                                      // Добавляем новый стат если его нет в основных
                                      mergedProperties.push(addProp);
                                    }
                                  });

                                  if (mergedProperties.length === 0 && additionalProperties.length === 0) {
                                    return <div className="text-[10px] builds-text-muted text-center py-2">Нет данных для этого артефакта</div>;
                                  }

                                  return (
                                    <>
                                      {/* Основные свойства + выбранные новые статы */}
                                      {mergedProperties.map((prop) => {
                                        const finalProp = mergedProperties.find(p => p.stat_name === prop.stat_name) || prop;
                                        const isFromAdditional = !mainProperties.some(p => p.stat_name === prop.stat_name);
                                        return (
                                          <div
                                            key={prop.stat_name}
                                            className="flex items-center justify-between py-1 px-2 rounded bg-white/5"
                                            style={{
                                              border: isFromAdditional ? '1px solid rgba(255, 255, 255, 0.4)' : 'none',
                                              animation: isFromAdditional ? 'pulse 2s infinite' : 'none'
                                            }}
                                          >
                                            <div className="flex-1">
                                              <div className="text-[10px]">{prop.stat_name}</div>
                                            </div>
                                            <div className="text-[10px] font-mono font-medium" style={{ color: prop.is_harmful ? '#ef4444' : '#ffffff' }}>
                                              {finalProp.finalValue > 0 ? '+' : ''}{parseFloat(finalProp.finalValue.toFixed(2))}{prop.unit}
                                            </div>
                                          </div>
                                        );
                                      })}

                                      {/* Кнопка дополнительных свойств */}
                                      {additionalProperties.length > 0 && (
                                        <button
                                          onClick={() => setShowAdditionalStats(!showAdditionalStats)}
                                          className="w-full py-1 mt-2 text-[10px] font-semibold rounded border transition-all"
                                          style={{
                                            backgroundColor: showAdditionalStats ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                            color: '#ffffff',
                                            borderColor: 'rgba(255, 255, 255, 0.3)'
                                          }}
                                        >
                                          {showAdditionalStats ? 'Скрыть дополнительные' : `Дополнительные свойства (${selectedAdditionalStats.size}/${maxSelected})`}
                                        </button>
                                      )}

                                      {/* Дополнительные свойства */}
                                      {showAdditionalStats && additionalProperties.length > 0 && (
                                        <div className="space-y-1 mt-2">
                                          {additionalProperties.map((prop) => {
                                            const isSelected = selectedAdditionalStats.has(prop.stat_name);
                                            const canSelect = selectedAdditionalStats.size < maxSelected || isSelected;
                                            const isInMain = mainProperties.some(p => p.stat_name === prop.stat_name);

                                            return (
                                              <div
                                                key={`${prop.stat_name}-add`}
                                                onClick={() => {
                                                  if (!canSelect) return;
                                                  const newSelected = new Set(selectedAdditionalStats);
                                                  if (isSelected) {
                                                    newSelected.delete(prop.stat_name);
                                                  } else {
                                                    newSelected.add(prop.stat_name);
                                                  }
                                                  setSelectedAdditionalStats(newSelected);
                                                }}
                                                className={`flex items-center justify-between py-1 px-2 rounded cursor-pointer transition-all ${
                                                  isSelected ? 'bg-white/10' : 'bg-white/5'
                                                } ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                style={{
                                                  border: isSelected ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid transparent'
                                                }}
                                              >
                                                <div className="flex items-center gap-2 flex-1">
                                                  <div className={`w-3 h-3 rounded border flex items-center justify-center ${
                                                    isSelected ? 'bg-white/20' : 'bg-transparent'
                                                  }`} style={{ borderColor: 'rgba(255, 255, 255, 0.5)' }}>
                                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                  </div>
                                                  <div className="text-[10px]">{prop.stat_name}</div>
                                                </div>
                                                <div className="text-[10px] font-mono font-medium" style={{ color: prop.is_harmful ? '#ef4444' : '#ffffff' }}>
                                                  {prop.finalValue > 0 ? '+' : ''}{parseFloat(prop.finalValue.toFixed(2))}{prop.unit}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Центральная колонка - СХЕМА СЛОТОВ */}
          <div className="flex flex-col gap-3">
            <SectionHeader>СХЕМА КОНТЕЙНЕРА</SectionHeader>
            
            {!selectedContainer ? (
              <div className="p-8 flex items-center justify-center text-center builds-card artifact-search-panel">
                <div className="corner-bracket tl" />
                <div className="corner-bracket tr" />
                <div className="corner-bracket bl" />
                <div className="corner-bracket br" />
                <div>
                  <div className="text-sm mb-2">Сначала выбери контейнер</div>
                  <div className="text-xs builds-text-muted">чтобы увидеть доступные слоты</div>
                </div>
              </div>
            ) : (
              <div className="p-3 builds-card artifact-search-panel">
                <div className="corner-bracket tl" />
                <div className="corner-bracket tr" />
                <div className="corner-bracket bl" />
                <div className="corner-bracket br" />
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 relative">
                  {Array.from({ length: selectedContainer.slots }).map((_, index) => {
                    const item = buildItems[index];
                    const isActive = activeSlotIndex === index && !item;
                    return (
                      <button
                        key={item?.id || `empty-${index}`}
                        onClick={() => {
                          if (item) {
                            setPendingArtifact({
                              id: item.id,
                              item_id: item.item_id,
                              name: item.name,
                              icon: item.icon,
                              quality: qualityToString(item.quality),
                              marketPrice: searchResults.find(a => a.item_id === item.item_id)?.marketPrice,
                              variants: artifactVariants[item.item_id] || searchResults.find(a => a.item_id === item.item_id)?.variants,
                            });
                            setSelectedQuality(item.quality);
                            setSelectedUpgradeLevel(item.upgrade_level);
                            setSelectedRank(item.selectedRank ?? null);
                            setSelectedAdditionalStats(new Set(item.selectedAdditionalStats || []));
                            setShowAdditionalStats(false);
                            setActiveSlotIndex(index);
                          } else {
                            setActiveSlotIndex(activeSlotIndex === index ? null : index);
                          }
                        }}
                        className="aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative"
                        style={{
                          border: item
                            ? `2px solid ${qualityColor(qualityToString(item.quality)) || 'var(--builds-accent)'}`
                            : isActive
                              ? '2px solid var(--builds-selected)'
                              : '2px dashed var(--builds-border)',
                          backgroundColor: item
                            ? `${qualityColor(qualityToString(item.quality))}22`
                            : isActive
                              ? 'rgba(232, 184, 74, 0.55)'
                              : 'var(--builds-panel-bg)',
                          boxShadow: isActive ? '0 0 12px var(--builds-selected)' : 'none',
                        }}
                      >
                        {isActive && (
                          <>
                            <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 rounded-tl" style={{ borderColor: 'var(--builds-selected)' }} />
                            <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 rounded-tr" style={{ borderColor: 'var(--builds-selected)' }} />
                            <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 rounded-bl" style={{ borderColor: 'var(--builds-selected)' }} />
                            <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 rounded-br" style={{ borderColor: 'var(--builds-selected)' }} />
                          </>
                        )}
                        {item ? (
                          item.icon && <img src={item.icon} alt="" className="w-8 h-8 rounded" />
                        ) : (
                          <Plus size={20} style={{ color: isActive ? 'var(--builds-bg)' : 'var(--builds-text-muted)' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="text-center text-[11px] builds-text-muted font-mono-builds mt-2">
                  {buildItems.length} / {selectedContainer.slots} СЛОТОВ ЗАПОЛНЕНО
                </div>
              </div>
            )}

          </div>

            {/* Правая колонка - ПОКАЗАНИЯ */}
            <div className="flex flex-col gap-3">
            <SectionHeader>ПОКАЗАНИЯ</SectionHeader>
            
            {!balance ? (
              <div className="p-8 flex items-center justify-center text-center builds-card artifact-search-panel">
                <div className="corner-bracket tl" />
                <div className="corner-bracket tr" />
                <div className="corner-bracket bl" />
                <div className="corner-bracket br" />
                <div>
                  <div className="text-sm mb-2">Выбери контейнер и броню</div>
                  <div className="text-xs builds-text-muted">чтобы увидеть показатели заражения</div>
                </div>
              </div>
            ) : (
              <>
              {/* Радиальные индикаторы */}
              <div className="p-3 builds-card artifact-search-panel">
                <div className="corner-bracket tl" />
                <div className="corner-bracket tr" />
                <div className="corner-bracket bl" />
                <div className="corner-bracket br" />
                  <div className="text-xs font-semibold mb-3 builds-text-muted">БАЛАНС ЗАРАЖЕНИЯ</div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {Object.entries(balance.armorProtection)
                        .filter(([_, value]) => value > 0)
                        .sort(([_, a], [__, b]) => b - a)
                        .map(([key, value]) => (
                          <RadialGauge
                            key={key}
                            value={value}
                            max={100}
                            contaminationKey={key}
                          />
                        ))}
                  </div>
                </div>

                {/* Суммарные статы */}
                <div className="p-3 builds-card artifact-search-panel">
                  <div className="corner-bracket tl" />
                  <div className="corner-bracket tr" />
                  <div className="corner-bracket bl" />
                  <div className="corner-bracket br" />
                  <div className="text-xs font-semibold mb-3 builds-text-muted">СУММАРНЫЕ СТАТЫ</div>
                  <div className="space-y-2">
                    {Object.entries(artifactTotals).map(([key, stat]) => (
                      stat.value !== 0 && (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="builds-text-muted flex items-center gap-1.5">
                            {stat.icon && <stat.icon size={12} />}
                            {stat.label}
                          </span>
                          <span className={`font-mono-builds ${stat.isHarmful ? 'builds-negative' : 'builds-positive'}`}>
                            {stat.value > 0 ? '+' : ''}{stat.value}{stat.unit}
                          </span>
                        </div>
                      )
                    ))}
                  </div>
                </div>

                {/* Статус сборки */}
                <div className="p-3 builds-card artifact-search-panel">
                  <div className="corner-bracket tl" />
                  <div className="corner-bracket tr" />
                  <div className="corner-bracket bl" />
                  <div className="corner-bracket br" />
                  <div className="text-xs font-semibold mb-2 builds-text-muted">СТАТУС СБОРКИ</div>
                  {(() => {
                    const criticalEntry = Object.entries(balance.armorProtection).find(([_, value]) => value >= 90);
                    const slotsIncomplete = selectedContainer && buildItems.length < selectedContainer.slots;

                    if (criticalEntry) {
                      const label = CONTAMINATION_MAP[criticalEntry[0]]?.label || criticalEntry[0];
                      return (
                        <div className="text-sm font-semibold builds-negative">
                          Превышение защиты по {label}
                        </div>
                      );
                    }
                    if (slotsIncomplete) {
                      return (
                        <div className="text-sm font-semibold builds-warning">
                          Не хватает артефактов
                        </div>
                      );
                    }
                    return (
                      <div className="text-sm font-semibold builds-positive">
                        Сборка готова
                      </div>
                    );
                  })()}
                </div>

                {/* Детали выбранного артефакта */}
                {selectedArtifact && (
                  <div className="p-3 builds-card artifact-search-panel">
                    <div className="corner-bracket tl" />
                    <div className="corner-bracket tr" />
                    <div className="corner-bracket bl" />
                    <div className="corner-bracket br" />
                    <div className="flex items-center gap-3">
                      {selectedArtifact.icon && <img src={selectedArtifact.icon} alt="" className="w-10 h-10 rounded" />}
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{selectedArtifact.name}</div>
                        <button
                          onClick={() => removeArtifact(selectedArtifact.item_id)}
                          className="text-xs mt-1 builds-negative bg-transparent border-none cursor-pointer"
                        >
                          Удалить из сборки
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Нижний статус-бар */}
        <div
          className="mt-2 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] font-mono-builds border-t gap-2"
          style={{ borderColor: 'var(--builds-border)', color: 'var(--builds-text-muted)' }}
        >
          <div className="flex items-center gap-3">
            <span>SZINSIGHT PDA v3.1</span>
            <span>·</span>
            <span>BUILD SYSTEM</span>
          </div>
          <div className="flex items-center gap-3">
            <span>DATA UPDATED: {Math.max(0, Math.round((nowTick - lastUpdatedAt) / 1000))}s AGO</span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              API: ONLINE
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--builds-positive)' }} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}