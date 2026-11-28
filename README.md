# FreshSave – Smart Food Expiry & Waste Predictor

FreshSave is a futuristic, cyberpunk-styled, 100% browser-local web application that helps reduce food waste by tracking user-entered groceries, calculating days remaining until expiry, surfacing rule-based consumption priorities, and matching available ingredients against a built-in recipe database.

**No API keys, no paid APIs, and no external AI services are used.**

## Features

- **Futuristic Opening Animation Page**: Animated cyberpunk holographic boot splash with rotating orbital rings, neon laser sweep, progress indicator, and instant skip/replay support.
- **Zero Pre-Set Items & Optional Expiry Dates**: Starts completely empty with only the groceries you add. Enter an expiry date when you know it, or leave it blank and set it later with one click.
- **Smart Food Dashboard**: Live counters for Total Food Items, Fresh / Unscheduled Items, Expiring Soon (within 3 days), and Expired Items alongside a neon SVG donut chart and category breakdown chart.
- **Rule-Based Smart Recommendations**: Local JavaScript rules (explicitly labeled as rule-based logic) rank consumption priority, provide keyword- and category-matched storage tips, and suggest recipes from available ingredients.
- **Local Recipe Finder**: Toggle ingredients from your inventory, select common staples, or add custom ingredients to match recipes from the built-in recipe database.
- **LocalStorage Persistence**: All inventory entries, purchase records, consumption/waste history, environmental factors, and goals are saved automatically in `localStorage`.
- **Optional Purchase Price Tracking (₹ INR)**: Optionally enter total purchase cost and quantity purchased; FreshSave calculates price per unit and remaining item value automatically.
- **Consumption & Waste Logging**: Mark full or partial quantities as **Consumed** or **Wasted** (with waste reason tracking) without auto-wasting expired alerts.
- **Waste & Savings Analytics**: Track Total Money Saved, Food Wasted, Food Waste Prevented (approaching-expiry subset), Financial Analytics, 4 interactive cyberpunk charts, configurable CO₂e/weight estimates, rule-based Waste Insights, CSV/Print weekly & monthly reports, and waste-reduction goals & streaks.

## How to Run Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Start the local development server**:
   ```bash
   npm run dev
   ```
3. **Open in your browser**:
   Visit `http://localhost:3000`.

### Production Build

```bash
npm run build
npm run preview
```
