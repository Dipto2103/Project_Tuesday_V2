import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Search,
  CheckCircle2,
  MapPin,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Flame,
  Droplets,
  Radio,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Chip } from '../components/ui/Chip';
import type { Checkpoint } from '../core/types';

interface ArticleSource {
  title: string;
  url: string;
}

interface Article {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  tags: string[];
  checkpoints: string[];
  sources: ArticleSource[];
  provenance: string;
}

export const FieldManualPage: React.FC = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [activeArticleId, setActiveArticleId] = useState<string>('moxie-atmospheric-o2');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/articles.json`)
      .then((r) => r.json())
      .then((data: Article[]) => {
        setArticles(data);
        if (data.length > 0 && !data.some((a) => a.id === activeArticleId)) {
          setActiveArticleId(data[0].id);
        }
      })
      .catch((err) => console.warn('[MANUAL] Failed to load articles:', err));

    fetch(`${import.meta.env.BASE_URL}data/checkpoints.json`)
      .then((r) => r.json())
      .then((data: Checkpoint[]) => setCheckpoints(data))
      .catch((err) => console.warn('[MANUAL] Failed to load checkpoints:', err));
  }, [activeArticleId]);

  // Concept board ordered topics:
  // 1 Breathing & Body, 2 Water Management, 3 Food & Agriculture, 4 Spacesuit & Equipment, 5 Emergency Procedures
  const orderedTopicMap: { id: string; num: string; label: string; articleId: string }[] = [
    {
      id: 'topic-1',
      num: '1.',
      label: 'Breathing & Body',
      articleId: 'moxie-atmospheric-o2'
    },
    {
      id: 'topic-2',
      num: '2.',
      label: 'Water Management',
      articleId: 'water-ice-survival'
    },
    {
      id: 'topic-3',
      num: '3.',
      label: 'Food & Agriculture',
      articleId: 'martian-meteorites-water'
    },
    {
      id: 'topic-4',
      num: '4.',
      label: 'Spacesuit & Equipment',
      articleId: 'meda-thermal-regime'
    },
    {
      id: 'topic-5',
      num: '5.',
      label: 'Emergency Procedures',
      articleId: 'rsl-granular-hazard'
    }
  ];

  // Active article
  const activeArticle = useMemo(() => {
    return articles.find((a) => a.id === activeArticleId) || articles[0] || null;
  }, [articles, activeArticleId]);

  // Key points derived or parsed
  const keyPoints = useMemo(() => {
    if (!activeArticle) return [];
    if (activeArticle.id === 'moxie-atmospheric-o2') {
      return [
        'Use oxygen directly from your spacesuit PLSS or habitat ECLSS buffer.',
        'Keep suit and habitat partial oxygen pressure between 18–22 kPa to prevent hypoxia.',
        'Avoid prolonged exposure to Martian fine perchlorate dust during EVA ingress.'
      ];
    }
    if (activeArticle.id === 'water-ice-survival') {
      return [
        'Pure water-ice deposits exist within 1–5 m depth across Arcadia & Utopia Planitia.',
        'Subsurface Rodwell thermal extraction prevents open-air sublimation below 6.1 mbar.',
        'Recycle greywater continuously through vapor compression distillation units.'
      ];
    }
    if (activeArticle.id === 'meda-thermal-regime') {
      return [
        'Expect 88 K diurnal surface temperature swings between day (+5°C) and night (−83°C).',
        'Suit active liquid cooling and heating garment (LCVG) is essential below −40°C.',
        'Batteries and mechanical actuators freeze below −65°C unless heated by RHU.'
      ];
    }
    if (activeArticle.id === 'rsl-granular-hazard') {
      return [
        'RSL streaks are dry granular sand flows occurring on slopes steeper than 27 degrees.',
        'Never treat RSL as water resources — treat as steep terrain slip hazards.',
        'Traverse across active RSL slopes is strictly prohibited by planetary protection rules.'
      ];
    }
    return [
      'Follow NASA exploration protocols and maintain regular communication with habitat base.',
      'Always carry reserve life-support consumables providing at least a 20% margin.',
      'Check terrain roughness and slope before traversing unknown regolith corridors.'
    ];
  }, [activeArticle]);

  // Related equipment list
  const relatedEquipment = [
    {
      name: 'Spacesuit (Z-2 Class)',
      mass: '12.4 kg (Mars)',
      desc: 'Rear-entry planetary exploration suit with titanium bearings and integrated HUD.',
      icon: '👨‍🚀'
    },
    {
      name: 'Oxygen Tank (PLSS)',
      mass: '2.1 kg (Mars)',
      desc: 'High-pressure carbon-wrapped composite cylinder with 8-hour EVA supply.',
      icon: '🧯'
    },
    {
      name: 'Thermal Liner (Aerogel)',
      mass: '0.8 kg (Mars)',
      desc: 'Multilayer silica aerogel insulation tested to withstand −120°C nocturnal chill.',
      icon: '🦺'
    }
  ];

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8 text-[#E7E1D8]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(231,225,216,0.10)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-[#FF7043]" />
            <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#FF7043]">
              EXPEDITION SURVIVAL MANUAL
            </span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase text-white">
            SURVIVAL HANDBOOK
          </h1>
          <p className="font-sans text-sm text-[#A0A0A0] mt-1">
            Essential knowledge for life and exploration on Mars
          </p>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#15181D] border border-[rgba(231,225,216,0.12)] w-full sm:w-72">
          <Search className="w-4 h-4 text-[#A0A0A0] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search handbook topics..."
            className="w-full bg-transparent text-xs text-[#E7E1D8] placeholder-[#6B6F76] focus:outline-none font-sans"
          />
        </div>
      </div>

      {/* Main Layout: Left Topics Column (320px) + Right Article Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Topic List (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#A0A0A0] font-semibold px-2">
            TABLE OF CONTENTS
          </span>

          <div className="space-y-1.5">
            {orderedTopicMap.map((topic) => {
              const isActive = activeArticleId === topic.articleId;
              return (
                <button
                  key={topic.id}
                  onClick={() => setActiveArticleId(topic.articleId)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl font-display text-sm font-semibold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#C65D38] text-white shadow-lg shadow-[#C65D38]/30 border border-[#FF7043]/50'
                      : 'bg-[#15181D]/80 hover:bg-[#1C2027] text-[#A0A0A0] hover:text-[#E7E1D8] border border-[rgba(231,225,216,0.08)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs opacity-75">{topic.num}</span>
                    <span>{topic.label}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#6B6F76]'}`} />
                </button>
              );
            })}
          </div>

          {/* Further articles from articles.json */}
          {articles.length > 5 && (
            <div className="mt-4 pt-4 border-t border-[rgba(231,225,216,0.08)]">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#6B6F76] px-2 block mb-2">
                ADDITIONAL RESEARCH DOSSIERS
              </span>
              <div className="space-y-1">
                {articles.slice(5).map((art) => (
                  <button
                    key={art.id}
                    onClick={() => setActiveArticleId(art.id)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs truncate transition-all cursor-pointer ${
                      activeArticleId === art.id
                        ? 'bg-[#1C2027] text-[#FF7043] font-bold'
                        : 'text-[#A0A0A0] hover:text-[#E7E1D8] hover:bg-[#15181D]'
                    }`}
                  >
                    • {art.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Article View (8 Cols) */}
        {activeArticle && (
          <article className="lg:col-span-8 flex flex-col gap-6 max-w-[70ch]">
            {/* Hero Banner for Article */}
            <div className="relative rounded-2xl overflow-hidden border border-[rgba(231,225,216,0.12)] h-64 sm:h-80 shadow-2xl">
              <img
                src={`${import.meta.env.BASE_URL}brand/hero.jpg`}
                alt="Astronaut exploration gear on Mars"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D10] via-[#0B0D10]/50 to-transparent" />
              <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
                <ProvenanceBadge
                  type={activeArticle.provenance || 'NASA-DERIVED'}
                  source={activeArticle.sources?.[0]?.title}
                  url={activeArticle.sources?.[0]?.url}
                />
                <span className="text-[10px] font-mono text-[#A0A0A0]">
                  NASA / JPL Scientific Field Guide
                </span>
              </div>
            </div>

            {/* Article Title & Lede */}
            <div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl uppercase text-white tracking-wide">
                {activeArticle.title}
              </h2>
              <p className="font-sans text-base text-[#E7E1D8]/90 mt-3 leading-relaxed">
                {activeArticle.summary}
              </p>
            </div>

            {/* Key Points Glass Card */}
            <GlassPanel variant="card" className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-[#FF7043]" />
                <span className="font-display font-bold text-xs uppercase tracking-widest text-[#FF7043]">
                  KEY POINTS
                </span>
              </div>
              <ul className="space-y-3 font-sans text-sm text-[#E7E1D8]">
                {keyPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF7043] shrink-0 mt-2" />
                    <span className="leading-relaxed">{pt}</span>
                  </li>
                ))}
              </ul>
            </GlassPanel>

            {/* Main Article Prose */}
            <div className="prose prose-invert max-w-none font-sans text-sm sm:text-base leading-relaxed text-[#E7E1D8]/85 space-y-4 whitespace-pre-line">
              {activeArticle.content}
            </div>

            {/* Related Equipment Section */}
            <div className="pt-4 border-t border-[rgba(231,225,216,0.10)]">
              <span className="font-display font-bold text-xs uppercase tracking-widest text-[#A0A0A0] block mb-4">
                RELATED EQUIPMENT
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {relatedEquipment.map((eq, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-[#15181D]/80 border border-[rgba(231,225,216,0.10)] flex flex-col justify-between hover:border-[rgba(231,225,216,0.22)] transition-all"
                  >
                    <div>
                      <div className="text-2xl mb-2">{eq.icon}</div>
                      <h4 className="font-display font-bold text-sm text-[#E7E1D8]">
                        {eq.name}
                      </h4>
                      <p className="text-xs font-mono text-[#56D9E8] mt-1">{eq.mass}</p>
                      <p className="text-xs text-[#A0A0A0] mt-1.5 line-clamp-2">{eq.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/planner')}
                      className="mt-3 text-xs font-mono text-[#FF7043] hover:underline text-left cursor-pointer"
                    >
                      View details →
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Locations Chips */}
            {activeArticle.checkpoints && activeArticle.checkpoints.length > 0 && (
              <div className="pt-4 border-t border-[rgba(231,225,216,0.10)]">
                <span className="font-display font-bold text-xs uppercase tracking-widest text-[#A0A0A0] block mb-3">
                  RELATED LOCATIONS
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeArticle.checkpoints.map((cpId) => {
                    const found = checkpoints.find((c) => c.id === cpId);
                    return (
                      <button
                        key={cpId}
                        type="button"
                        onClick={() => {
                          if (found) {
                            navigate(`/map?lat=${found.lat}&lon=${found.lonE}`);
                          } else {
                            navigate('/map');
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#15181D] hover:bg-[#1C2027] border border-[rgba(231,225,216,0.12)] hover:border-[#FF7043]/50 text-xs font-mono text-[#E7E1D8] transition-all cursor-pointer"
                      >
                        <MapPin className="w-3 h-3 text-[#FF7043]" />
                        <span>{found ? found.name : cpId}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-[#A0A0A0]" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  );
};
