"use client";

import { motion } from "framer-motion";
import { 
  Shield, 
  TrendingUp, 
  Zap, 
  Eye, 
  Clock, 
  BarChart3, 
  Sparkles, 
  Globe, 
  Users,
  ArrowRight,
  CheckCircle,
  Target,
  Rocket
} from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function AboutPage() {
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
      icon: <TrendingUp size={24} />,
      title: "Рыночная аналитика",
      description: "Отслеживай цены артефактов в реальном времени с детальной статистикой и графиками",
      color: "from-green-500/20 to-green-500/5",
      borderColor: "border-green-500/30",
      textColor: "text-green-400"
    },
    {
      icon: <Eye size={24} />,
      title: "Живая лента",
      description: "Смотри выгодные предложения и аномалии на рынке моментально после их появления",
      color: "from-blue-500/20 to-blue-500/5",
      borderColor: "border-blue-500/30",
      textColor: "text-blue-400"
    },
    {
      icon: <Zap size={24} />,
      title: "Умные алгоритмы",
      description: "AI-анализ ликвидности, доверия и потенциальной прибыли каждого лота",
      color: "from-purple-500/20 to-purple-500/5",
      borderColor: "border-purple-500/30",
      textColor: "text-purple-400"
    },
    {
      icon: <Target size={24} />,
      title: "Список наблюдения",
      description: "Добавляй артефакты в избранное и получай уведомления о изменении цен",
      color: "from-orange-500/20 to-orange-500/5",
      borderColor: "border-orange-500/30",
      textColor: "text-orange-400"
    },
    {
      icon: <BarChart3 size={24} />,
      title: "Портфель сделок",
      description: "Веди учет своих инвестиций, отслеживай прибыль и анализируй стратегию",
      color: "from-pink-500/20 to-pink-500/5",
      borderColor: "border-pink-500/30",
      textColor: "text-pink-400"
    },
    {
      icon: <Rocket size={24} />,
      title: "Конструктор сборок",
      description: "Создавай оптимальные сборки артефактов с расчетом статов и стоимости",
      color: "from-cyan-500/20 to-cyan-500/5",
      borderColor: "border-cyan-500/30",
      textColor: "text-cyan-400"
    }
  ];

  const stats = [
    { value: "10K+", label: "Артефактов в базе", icon: <Sparkles size={20} /> },
    { value: "24/7", label: "Мониторинг рынка", icon: <Clock size={20} /> },
    { value: "<1s", label: "Задержка данных", icon: <Zap size={20} /> },
    { value: "∞", label: "История цен", icon: <BarChart3 size={20} /> }
  ];

  const faq = [
    {
      question: "Как часто обновляются данные?",
      answer: "Данные обновляются каждые 10 секунд, что позволяет отслеживать изменения цен в реальном времени и реагировать на рыночные ситуации мгновенно."
    },
    {
      question: "Нужна ли авторизация?",
      answer: "Базовые функции доступны без авторизации. Для доступа к персональным функциям (список наблюдения, портфель, расширенная аналитика) требуется войти через Steam или Exbo."
    },
    {
      question: "Как формируются рекомендации?",
      answer: "Наши алгоритмы анализируют ликвидность, исторические данные, волатильность и другие метрики для определения наиболее выгодных предложений на рынке."
    },
    {
      question: "Можно ли использовать на мобильных?",
      answer: "Да, интерфейс полностью адаптирован для работы на любых устройствах - от десктопов до смартфонов."
    }
  ];

  return (
    <div className="min-h-screen w-full" style={{ 
      backgroundColor: '#0d1626', 
      margin: 0, 
      padding: 0, 
      width: '100vw',
      backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(99, 102, 241, 0.05) 0%, transparent 40%), radial-gradient(circle at 70% 60%, rgba(59, 130, 246, 0.05) 0%, transparent 40%)',
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
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                <div className="relative bg-[#0d1626] border border-primary/30 rounded-full p-4">
                  <Sparkles size={32} className="text-primary" />
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Market Insight
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Инструмент для анализа рынка артефактов с удобным интерфейсом и полезными функциями
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="group flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium transition-all hover:scale-105 shadow-lg shadow-primary/30"
              >
                Начать использовать
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/catalog"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all hover:scale-105 border border-white/10"
              >
                <Globe size={16} />
                Каталог
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-5 hover:border-primary/30 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2 text-primary">
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold mb-2 text-white">Возможности</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex items-start gap-4 p-5 rounded-xl border border-white/10 bg-white/5 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 group"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <div className="text-primary">{feature.icon}</div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 text-white group-hover:text-primary transition-colors">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold mb-2 text-white">Как это работает</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Мониторинг",
                description: "Система непрерывно сканирует рынок, собирая данные о ценах, ликвидности и предложениях в реальном времени"
              },
              {
                step: "02",
                title: "Анализ",
                description: "AI-алгоритмы обрабатывают данные, выявляя аномалии, тренды и потенциально выгодные предложения для покупки"
              },
              {
                step: "03",
                title: "Уведомления",
                description: "Получай мгновенные оповещения о появлении выгодных лотов и изменении цен в списке наблюдения"
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="text-center p-6 rounded-xl border border-white/10 bg-white/5 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300"
              >
                <div className="text-4xl font-bold text-primary/30 mb-3">{item.step}</div>
                <h3 className="text-lg font-semibold mb-3 text-white">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-bold mb-2 text-white">Частые вопросы</h2>
          </motion.div>

          <div className="space-y-4">
            {faq.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="rounded-xl border border-white/10 bg-white/5 p-5 hover:border-primary/30 hover:bg-primary/5 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <CheckCircle size={16} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 text-white">{item.question}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.answer}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
