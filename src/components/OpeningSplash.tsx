import { ArrowRight, Leaf } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface OpeningSplashProps {
  onComplete: () => void;
}

export function OpeningSplash({ onComplete }: OpeningSplashProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 2600;
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);
      if (elapsed < duration) {
        rafId = requestAnimationFrame(tick);
      } else {
        onComplete();
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden cyber-backdrop px-6"
      role="dialog"
      aria-label="FreshSave opening animation"
    >
      {/* Subtle scanline texture */}
      <div className="pointer-events-none absolute inset-0 cyber-scanlines opacity-70" />

      {/* Horizontal neon laser sweep */}
      <motion.div
        initial={{ y: '-45vh', opacity: 0 }}
        animate={{ y: '45vh', opacity: [0, 0.85, 0.85, 0] }}
        transition={{ duration: 2.3, ease: 'easeInOut' }}
        className="pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_24px_rgba(34,211,238,0.9)]"
      />

      {/* Futuristic corner HUD frames */}
      <div className="pointer-events-none absolute inset-6 sm:inset-10">
        <span className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400/60" />
        <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-fuchsia-400/60" />
        <span className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-fuchsia-400/60" />
        <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400/60" />
      </div>

      {/* Central Holographic Emblem */}
      <div className="relative flex flex-col items-center text-center max-w-xl z-10">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-36 h-36 flex items-center justify-center mb-8"
        >
          {/* Ambient neon aura */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/25 via-fuchsia-500/20 to-emerald-400/25 blur-2xl" />

          {/* Outer rotating orbital ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border border-dashed border-cyan-400/60"
          />

          {/* Inner counter-rotating ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-3 rounded-full border-2 border-t-fuchsia-400 border-r-transparent border-b-cyan-400 border-l-transparent"
          />

          {/* Glowing core */}
          <motion.div
            initial={{ rotate: -18, scale: 0.85 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 via-emerald-400 to-fuchsia-500 p-[2px] shadow-[0_0_32px_rgba(34,211,238,0.45)]"
          >
            <div className="w-full h-full rounded-[14px] bg-[#080B16] flex items-center justify-center">
              <Leaf className="w-9 h-9 text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" aria-hidden="true" />
            </div>
          </motion.div>
        </motion.div>

        {/* Kinetic Futuristic Headline */}
        <motion.h1
          initial={{ y: 20, opacity: 0, letterSpacing: '0.28em' }}
          animate={{ y: 0, opacity: 1, letterSpacing: '0.14em' }}
          transition={{ duration: 0.75, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-5xl font-extrabold tracking-widest bg-gradient-to-r from-cyan-300 via-white to-fuchsia-400 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(34,211,238,0.35)]"
        >
          FRESHSAVE
        </motion.h1>

        <motion.p
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="mt-3 text-sm sm:text-base text-slate-300 tracking-wide"
        >
          Smart Food Expiry &amp; Waste Predictor
        </motion.p>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="mt-8 w-64 sm:w-72 space-y-2"
        >
          <div className="h-1.5 w-full rounded-full bg-slate-800/90 overflow-hidden border border-cyan-400/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-fuchsia-500 shadow-[0_0_12px_rgba(34,211,238,0.8)] transition-[width] duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-cyan-300/90 tabular-nums">
            <span>Loading local pantry grid</span>
            <span>{progress}%</span>
          </div>
        </motion.div>

        {/* Enter Immediately Button */}
        <motion.button
          type="button"
          onClick={onComplete}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.65 }}
          className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold tracking-wider uppercase text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.45)] transition-colors cursor-pointer whitespace-nowrap"
        >
          <span>Enter Kitchen Hub</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </motion.button>
      </div>
    </motion.div>
  );
}
