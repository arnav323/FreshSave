import {
  BarChart3,
  BookOpen,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  Leaf,
  Lightbulb,
  Menu,
  Play,
  Plus,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { NavSection } from '../types/food';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onAddClick: () => void;
  onReplayIntro: () => void;
  counts: {
    total: number;
    expiringSoon: number;
    expired: number;
  };
}

export function Sidebar({
  activeSection,
  onSelectSection,
  onAddClick,
  onReplayIntro,
  counts,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: {
    id: NavSection;
    label: string;
    icon: typeof LayoutDashboard;
    count?: number;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Food Inventory', icon: ClipboardList, count: counts.total },
    { id: 'analytics', label: 'Waste & Savings Analytics', icon: BarChart3 },
    {
      id: 'recommendations',
      label: 'Smart Recommendations',
      icon: Lightbulb,
      count: counts.expiringSoon + counts.expired,
    },
    { id: 'recipes', label: 'Recipe Finder', icon: ChefHat },
    { id: 'storage', label: 'Storage Tips', icon: BookOpen },
  ];

  const handleSelect = (id: NavSection) => {
    onSelectSection(id);
    setMobileOpen(false);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#090C18]/95 backdrop-blur-md">
      {/* Brand */}
      <div className="px-5 h-16 flex items-center justify-between border-b border-cyan-400/20 shrink-0">
        <button
          type="button"
          onClick={() => handleSelect('dashboard')}
          className="flex items-center gap-2.5 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-md"
        >
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 via-emerald-400 to-fuchsia-500 text-slate-950 shadow-[0_0_16px_rgba(34,211,238,0.4)] shrink-0">
            <Leaf className="w-4 h-4" aria-hidden="true" />
          </span>
          <div>
            <span className="block font-display text-sm font-bold tracking-wider text-slate-100 leading-none">
              FRESHSAVE
            </span>
            <span className="block text-[11px] text-cyan-300/80 mt-1 leading-none">
              Waste Predictor
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 cursor-pointer"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Primary Add CTA */}
      <div className="p-4 border-b border-cyan-400/15">
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            onAddClick();
          }}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Add Food Item</span>
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Main navigation" className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg border transition-all cursor-pointer text-left ${
                active
                  ? 'bg-cyan-400/12 border-cyan-400/45 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.12)]'
                  : 'border-transparent text-slate-300 hover:bg-slate-800/60 hover:text-cyan-200'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${active ? 'text-cyan-300' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.count === 'number' && item.count > 0 && (
                <span
                  className={`text-xs font-mono font-semibold tabular-nums shrink-0 ${
                    active ? 'text-cyan-300' : 'text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Replay Intro & Offline Note */}
      <div className="p-4 border-t border-cyan-400/15 space-y-3 bg-[#070913]">
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            onReplayIntro();
          }}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-fuchsia-300 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/30 rounded-lg transition-colors cursor-pointer"
        >
          <Play className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Replay Opening Intro</span>
        </button>
        <p className="text-xs text-slate-400 leading-relaxed">
          100% browser-local storage. No API key or external services required.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Compact Header */}
      <header className="no-print lg:hidden sticky top-0 z-30 bg-[#090C18]/95 backdrop-blur-md border-b border-cyan-400/20 px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            className="inline-flex items-center justify-center w-10 h-10 -ml-2 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60 cursor-pointer"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-slate-950">
            <Leaf className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <span className="font-display font-bold text-slate-100 text-sm tracking-wider">
            FRESHSAVE
          </span>
        </div>

        <button
          type="button"
          onClick={onAddClick}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Add Food</span>
        </button>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="fixed inset-0 bg-[#04050A]/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full border-r border-cyan-400/25 shadow-[0_0_40px_rgba(34,211,238,0.18)]">
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop Fixed Sidebar */}
      <aside className="no-print hidden lg:block w-64 shrink-0 border-r border-cyan-400/20 sticky top-0 h-screen">
        {navContent}
      </aside>
    </>
  );
}
