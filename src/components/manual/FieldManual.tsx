import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Tag,
  MapPin,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Compass,
  FileText
} from 'lucide-react';
import { SourceBadge } from '../common/SourceBadge';
import type { Checkpoint } from '../../core/types';

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

interface FieldManualProps {
  checkpoints?: Checkpoint[];
  onSelectCheckpoint?: (cp: Checkpoint) => void;
  onCenterMap?: (lat: number, lon: number) => void;
}

export const FieldManual: React.FC<FieldManualProps> = ({
  checkpoints = [],
  onSelectCheckpoint,
  onCenterMap
}) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/articles.json`)
      .then((r) => r.json())
      .then((data: Article[]) => {
        setArticles(data);
        if (data.length > 0) {
          setActiveArticleId(data[0].id);
        }
      })
      .catch((err) => console.warn('[FIELD MANUAL] Failed to load articles.json:', err));
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(articles.map((a) => a.category));
    return ['all', ...Array.from(cats)];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchesCat = selectedCategory === 'all' || art.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        art.title.toLowerCase().includes(q) ||
        art.summary.toLowerCase().includes(q) ||
        art.content.toLowerCase().includes(q) ||
        art.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCat && matchesQuery;
    });
  }, [articles, selectedCategory, searchQuery]);

  const activeArticle = useMemo(() => {
    return articles.find((a) => a.id === activeArticleId) || filteredArticles[0] || null;
  }, [articles, activeArticleId, filteredArticles]);

  const handleCheckpointClick = (cpId: string) => {
    const found = checkpoints.find((c) => c.id === cpId);
    if (found) {
      onSelectCheckpoint?.(found);
      onCenterMap?.(found.lat, found.lonE);
    }
  };

  return (
    <div className="space-y-6 text-mars-text">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-mars-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-mars-orange" />
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-white">
              Martian Field Manual & Intel Dossier
            </h2>
          </div>
          <p className="text-xs text-mars-muted font-mono mt-0.5">
            Operational science protocols, geology references, and survival directives.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-mars-muted" />
          <input
            type="text"
            placeholder="Search manual or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-mars-surface border border-mars-border rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-mars-muted focus:outline-none focus:border-mars-orange"
          />
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-lg border uppercase text-[11px] transition-all ${
              selectedCategory === cat
                ? 'bg-mars-orange border-mars-orange text-white font-bold shadow-md'
                : 'bg-mars-surface border-mars-border text-mars-muted hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Split Layout: Article List + Active Reader */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left List of Articles */}
        <div className="md:col-span-5 space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {filteredArticles.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-mars-muted border border-dashed border-mars-border rounded-xl">
              No field manual entries matching &quot;{searchQuery}&quot;.
            </div>
          ) : (
            filteredArticles.map((art) => {
              const isSelected = activeArticle?.id === art.id;
              return (
                <button
                  key={art.id}
                  onClick={() => setActiveArticleId(art.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all space-y-1.5 ${
                    isSelected
                      ? 'bg-mars-surface border-mars-orange shadow-lg shadow-mars-orange/10'
                      : 'bg-mars-surface/50 border-mars-border hover:bg-mars-surface hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-mars-sand font-bold">
                      {art.category}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-mars-dark text-mars-muted border border-mars-border/60">
                      {art.provenance}
                    </span>
                  </div>

                  <h3 className={`text-xs font-mono font-bold leading-tight ${isSelected ? 'text-white' : 'text-mars-text'}`}>
                    {art.title}
                  </h3>

                  <p className="text-[11px] text-mars-muted line-clamp-2 leading-relaxed">
                    {art.summary}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Right Active Article Viewer */}
        <div className="md:col-span-7">
          {activeArticle ? (
            <div className="p-5 rounded-xl bg-mars-surface border border-mars-border space-y-5 font-mono text-xs shadow-2xl">
              {/* Article Header */}
              <div className="space-y-2 border-b border-mars-border/60 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs uppercase font-bold text-mars-sand">
                    Category: {activeArticle.category}
                  </span>
                  <SourceBadge
                    status={(activeArticle.provenance as any) || 'NASA-DERIVED'}
                    sourceName={activeArticle.sources[0]?.title || 'NASA Science Report'}
                  />
                </div>

                <h2 className="text-base font-bold text-white tracking-wide">
                  {activeArticle.title}
                </h2>

                <p className="text-xs text-mars-sand/90 bg-mars-dark/60 p-3 rounded-lg border border-mars-border/60 leading-relaxed">
                  {activeArticle.summary}
                </p>
              </div>

              {/* Body Content */}
              <div className="text-xs text-mars-text/90 leading-relaxed whitespace-pre-line space-y-3">
                {activeArticle.content}
              </div>

              {/* Linked Checkpoints on Map */}
              {activeArticle.checkpoints.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-mars-border/60">
                  <div className="text-[11px] text-mars-muted flex items-center gap-1.5 font-bold uppercase">
                    <MapPin className="w-3.5 h-3.5 text-mars-orange" />
                    Geospatial Ground Anchors (Click to Navigate):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeArticle.checkpoints.map((cpId) => {
                      const cp = checkpoints.find((c) => c.id === cpId);
                      return (
                        <button
                          key={cpId}
                          onClick={() => handleCheckpointClick(cpId)}
                          className="px-2.5 py-1 rounded-lg bg-mars-dark border border-mars-border hover:border-mars-orange text-[10px] text-white flex items-center gap-1 transition-all group"
                        >
                          <span className="text-mars-orange group-hover:scale-110 transition-transform">◉</span>
                          <span>{cp?.name || cpId}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Citations & Sources */}
              {activeArticle.sources.length > 0 && (
                <div className="space-y-1.5 pt-3 border-t border-mars-border/60 text-[10px]">
                  <div className="text-mars-muted font-bold uppercase">Primary Source Citations:</div>
                  <div className="space-y-1">
                    {activeArticle.sources.map((s) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-mars-orange hover:underline flex items-center gap-1.5 truncate"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{s.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-xs font-mono text-mars-muted border border-mars-border rounded-xl">
              Select an article from the dossier list to read.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
