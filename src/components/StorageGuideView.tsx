import { CalendarCheck, Leaf, Refrigerator, ThermometerSnowflake } from 'lucide-react';
import { motion } from 'motion/react';

export function StorageGuideView() {
  const sections = [
    {
      icon: Refrigerator,
      title: 'Fridge Zone Strategy',
      points: [
        'Top & middle shelves: Ready-to-eat foods, leftovers, yogurt, and cooked meals.',
        'Bottom shelf (coldest): Raw meat, poultry, and seafood in sealed trays.',
        'Crisper drawers: Leafy greens and high-humidity vegetables.',
        'Fridge door (warmest): Condiments and juices—avoid storing milk or eggs here.',
      ],
    },
    {
      icon: ThermometerSnowflake,
      title: 'Freezing Before Expiry',
      points: [
        'Freeze bread sliced so you can toast single pieces straight from frozen.',
        'Freeze berries, sliced bananas, and chopped spinach before they soften.',
        'Portion chicken or meat into single-meal freezer bags if not cooking within 2 days.',
        'Label containers with the food name and freeze date for easy rotation.',
      ],
    },
    {
      icon: CalendarCheck,
      title: 'Understanding Date Labels',
      points: [
        '"Use By": Food-safety deadline commonly used on meat, fish, and fresh dairy.',
        '"Best Before / Best By": Quality and peak flavor indicator for dry goods and pantry staples.',
        '"Sell By": Store inventory rotation guide—many items stay fresh days past this date if chilled.',
      ],
    },
    {
      icon: Leaf,
      title: 'First-In, First-Out Habit',
      points: [
        'Place newly bought groceries behind older items so nothing hides at the back.',
        'Check FreshSave’s amber 3-day warning list before grocery shopping.',
        'Designate one dinner a week as a "clean-out-the-fridge" soup, stir-fry, or pasta night.',
      ],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <div className="bg-[#0D1121]/90 backdrop-blur-sm rounded-xl border border-cyan-400/20 p-6">
        <h2 className="text-lg font-bold text-slate-100">Food Storage &amp; Waste Prevention Guide</h2>
        <p className="text-xs text-slate-400 mt-1">
          Practical kitchen habits to extend shelf life and keep food out of the landfill.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <section
              key={section.title}
              className="bg-[#0D1121]/90 backdrop-blur-sm rounded-xl border border-slate-800 hover:border-cyan-400/35 p-6 space-y-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-400/10 text-cyan-300 border border-cyan-400/25 shrink-0">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <h3 className="text-base font-bold text-slate-100">{section.title}</h3>
              </div>
              <ul className="space-y-2.5 text-sm text-slate-300 leading-relaxed list-disc list-inside">
                {section.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </motion.div>
  );
}
