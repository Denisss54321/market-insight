"use client";

import { motion } from "framer-motion";
import { 
  Crown, 
  Check, 
  ArrowRight,
  Star,
  Zap,
  Eye,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function PlusPage() {
  useEffect(() => {
    const main = document.querySelector('main');
    if (main) {
      main.style.maxWidth = '100%';
      main.style.padding = '0';
      main.style.margin = '0';
    }
    document.documentElement.style.backgroundColor = '#0d1626';
    document.body.style.backgroundColor = '#0d1626';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.width = '100vw';
    document.body.style.overflowX = 'hidden';
    return () => {
      if (main) {
        main.style.maxWidth = '';
        main.style.padding = '';
        main.style.margin = '';
      }
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.width = '';
      document.body.style.overflowX = '';
    };
  }, []);

  const features = [
    {
      icon: <Zap size={20} />,
      title: "Быстрые уведомления",
      description: "Сразу узнавай о выгодных лотах"
    },
    {
      icon: <Eye size={20} />,
      title: "Безлимит наблюдения",
      description: "Добавляй сколько угодно артефактов"
    },
    {
      icon: <TrendingUp size={20} />,
      title: "Статистика сделок",
      description: "Веди учет своей торговли"
    },
    {
      icon: <Star size={20} />,
      title: "AI-подсказки",
      description: "Умные рекомендации для покупки"
    }
  ];

  const plans = [
    {
      name: "Бесплатный",
      price: "0 ₽",
      features: [
        "Базовый поиск",
        "Лента предложений",
        "5 артефактов в наблюдении"
      ],
      popular: false
    },
    {
      name: "Insight Plus",
      price: "299 ₽/мес",
      features: [
        "Все функции бесплатно",
        "Безлимит наблюдения",
        "Уведомления",
        "Статистика сделок",
        "AI-подсказки"
      ],
      popular: true
    }
  ];

  return (
    <div className="min-h-screen w-full" style={{ 
      backgroundColor: '#0d1626', 
      margin: 0, 
      padding: 0, 
      width: '100vw',
      backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(234, 179, 8, 0.05) 0%, transparent 40%), radial-gradient(circle at 70% 60%, rgba(59, 130, 246, 0.05) 0%, transparent 40%)',
      minHeight: '100vh',
      position: 'relative',
      top: 0,
      left: 0,
      marginTop: '-24px'
    }}>
      {/* Hero Section */}
      <section className="relative py-16 px-4 w-full" style={{ marginTop: 0, paddingTop: '80px' }}>

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl" />
                <div className="relative bg-[#0d1626] border border-yellow-500/30 rounded-full p-4">
                  <Crown size={32} className="text-yellow-400" />
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Insight Plus
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Дополнительные функции для удобной торговли артефактами
            </p>

            <Link
              href="#pricing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-medium transition-all hover:scale-105 shadow-lg shadow-yellow-500/30"
            >
              <Crown size={18} />
              Смотреть тарифы
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold mb-2 text-white">Что даёт Plus</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-all duration-300 group"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <div className="text-yellow-400">{feature.icon}</div>
                </div>
                <div>
                  <h3 className="font-semibold mb-1 text-white group-hover:text-yellow-400 transition-colors">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold mb-2 text-white">Тарифы</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`relative rounded-2xl border p-6 transition-all duration-300 hover:scale-105 ${
                  plan.popular 
                    ? 'border-yellow-500/50 bg-yellow-500/10 shadow-lg shadow-yellow-500/20' 
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-xl">
                    Популярный
                  </div>
                )}
                
                <h3 className="text-xl font-bold mb-1 text-white">{plan.name}</h3>
                <div className="text-2xl font-bold text-white mb-4">{plan.price}</div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check size={16} className={plan.popular ? "text-yellow-400" : "text-green-400"} />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${
                    plan.popular
                      ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg shadow-yellow-500/30'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  }`}
                >
                  {plan.popular ? 'Выбрать' : 'Текущий'}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
