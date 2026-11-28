import { jsPDF } from 'jspdf';
import type { FoodCategory, FoodItem, FoodTransaction } from '../types/food';
import type { AnalyticsSummary } from './analyticsEngine';
import { formatQty } from './analyticsEngine';

export interface CircleChartSlice {
  id: string;
  label: string;
  value: number;
  colorHex: string;
  rgb: [number, number, number];
}

export interface LineTrendPoint {
  dateIso: string;
  label: string;
  added: number;
  consumed: number;
  wasted: number;
}

export interface AdminPdfActivityRow {
  kind: 'added' | 'consumed' | 'wasted';
  groceryName: string;
  category: FoodCategory;
  quantity: number;
  unit: string;
  timestampIso: string;
  detailText: string;
}

export interface AdminPdfCategoryRow {
  category: FoodCategory;
  activeCount: number;
  consumedCount: number;
  wastedCount: number;
}

export interface AdminReportPdfInput {
  today: string;
  totalGroceriesCount: number;
  activeGroceriesCount: number;
  freshActiveCount: number;
  expiringSoonActiveCount: number;
  expiredActiveCount: number;
  noExpiryActiveCount: number;
  summary: AnalyticsSummary;
  categoryBreakdown: AdminPdfCategoryRow[];
  circleSlices: CircleChartSlice[];
  linePoints: LineTrendPoint[];
  recentActivities: AdminPdfActivityRow[];
}

export function buildAdminCircleSlices(counts: {
  freshActiveCount: number;
  expiringSoonActiveCount: number;
  expiredActiveCount: number;
  noExpiryActiveCount: number;
  consumedCount: number;
  wastedCount: number;
}): CircleChartSlice[] {
  return [
    {
      id: 'fresh',
      label: 'Fresh Active',
      value: counts.freshActiveCount,
      colorHex: '#10b981',
      rgb: [16, 185, 129],
    },
    {
      id: 'expiring',
      label: 'Expiring Soon',
      value: counts.expiringSoonActiveCount,
      colorHex: '#f59e0b',
      rgb: [245, 158, 11],
    },
    {
      id: 'consumed',
      label: 'Consumed',
      value: counts.consumedCount,
      colorHex: '#06b6d4',
      rgb: [6, 182, 212],
    },
    {
      id: 'wasted_expired',
      label: 'Expired / Wasted',
      value: counts.expiredActiveCount + counts.wastedCount,
      colorHex: '#f43f5e',
      rgb: [244, 63, 94],
    },
    {
      id: 'unscheduled',
      label: 'No Expiry',
      value: counts.noExpiryActiveCount,
      colorHex: '#a855f7',
      rgb: [168, 85, 247],
    },
  ];
}

function toShortDateLabel(iso: string): string {
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = Number(parts[1]) - 1;
  const dayNum = Number(parts[2]);
  const m = monthNames[monthIdx] ?? parts[1];
  return `${m} ${dayNum}`;
}

function toLocalIsoFromMs(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function buildAdminLineSeries(
  items: FoodItem[],
  transactions: FoodTransaction[]
): LineTrendPoint[] {
  const map = new Map<string, { added: number; consumed: number; wasted: number }>();

  const ensureDate = (dateIso: string) => {
    let bucket = map.get(dateIso);
    if (!bucket) {
      bucket = { added: 0, consumed: 0, wasted: 0 };
      map.set(dateIso, bucket);
    }
    return bucket;
  };

  for (const item of items) {
    const dateKey =
      typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)
        ? toLocalIsoFromMs(item.createdAt)
        : item.purchaseDate;
    ensureDate(dateKey).added += 1;
  }

  for (const tx of transactions) {
    const bucket = ensureDate(tx.dateISO);
    if (tx.transactionType === 'consumed') {
      bucket.consumed += 1;
    } else {
      bucket.wasted += 1;
    }
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-10)
    .map(([dateIso, counts]) => ({
      dateIso,
      label: toShortDateLabel(dateIso),
      added: counts.added,
      consumed: counts.consumed,
      wasted: counts.wasted,
    }));
}

function drawVectorDonutChart(
  doc: jsPDF,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  slices: CircleChartSlice[]
): void {
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    doc.setFillColor(226, 232, 240);
    doc.circle(cx, cy, outerR, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, innerR, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('0', cx, cy + 3, { align: 'center' });
    return;
  }

  let startAngle = -Math.PI / 2;
  const stepRad = (2 * Math.PI) / 180; // 2-degree smooth steps

  for (const slice of slices) {
    if (slice.value <= 0) continue;
    const sweep = (slice.value / total) * 2 * Math.PI;
    const endAngle = startAngle + sweep;
    doc.setFillColor(slice.rgb[0], slice.rgb[1], slice.rgb[2]);

    let a = startAngle;
    while (a < endAngle) {
      const nextA = Math.min(endAngle, a + stepRad);
      const x1 = cx + outerR * Math.cos(a);
      const y1 = cy + outerR * Math.sin(a);
      const x2 = cx + outerR * Math.cos(nextA);
      const y2 = cy + outerR * Math.sin(nextA);
      doc.triangle(cx, cy, x1, y1, x2, y2, 'F');
      a = nextA;
    }
    startAngle = endAngle;
  }

  // Donut hole + center total
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, innerR, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(String(total), cx, cy + 2, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('events', cx, cy + 11, { align: 'center' });
}

function drawVectorLineChart(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  points: LineTrendPoint[]
): void {
  // Chart frame
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, h, 4, 4, 'FD');

  const padL = 26;
  const padR = 14;
  const padT = 28;
  const padB = 22;
  const plotX = x + padL;
  const plotY = y + padT;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  if (points.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No recorded activity dates yet.', x + w / 2, y + h / 2, { align: 'center' });
    return;
  }

  const maxVal = Math.max(
    1,
    ...points.map((p) => Math.max(p.added, p.consumed, p.wasted))
  );

  // Horizontal gridlines & Y ticks
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  for (let i = 0; i <= 4; i += 1) {
    const gy = plotY + plotH - (i / 4) * plotH;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(plotX, gy, plotX + plotW, gy);
    const tickVal = Math.round((maxVal * i) / 4);
    doc.setTextColor(100, 116, 139);
    doc.text(String(tickVal), plotX - 5, gy + 2.5, { align: 'right' });
  }

  const getX = (idx: number) =>
    points.length === 1
      ? plotX + plotW / 2
      : plotX + (idx / (points.length - 1)) * plotW;
  const getY = (val: number) => plotY + plotH - (val / maxVal) * plotH;

  // Draw X labels
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  const labelStep = points.length > 6 ? 2 : 1;
  points.forEach((p, idx) => {
    if (idx % labelStep === 0 || idx === points.length - 1) {
      doc.text(p.label, getX(idx), plotY + plotH + 11, { align: 'center' });
    }
  });

  const series: Array<{
    key: 'added' | 'consumed' | 'wasted';
    rgb: [number, number, number];
  }> = [
    { key: 'added', rgb: [6, 182, 212] },
    { key: 'consumed', rgb: [16, 185, 129] },
    { key: 'wasted', rgb: [244, 63, 94] },
  ];

  for (const s of series) {
    doc.setDrawColor(s.rgb[0], s.rgb[1], s.rgb[2]);
    doc.setFillColor(s.rgb[0], s.rgb[1], s.rgb[2]);
    doc.setLineWidth(1.5);
    for (let i = 0; i < points.length; i += 1) {
      const px = getX(i);
      const py = getY(points[i][s.key]);
      if (i > 0) {
        const prevX = getX(i - 1);
        const prevY = getY(points[i - 1][s.key]);
        doc.line(prevX, prevY, px, py);
      }
      doc.circle(px, py, 2.2, 'F');
    }
  }
}

export function generateAdminReportPdf(input: AdminReportPdfInput): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 44;

  const ensureSpace = (needed: number) => {
    if (y + needed > 785) {
      doc.addPage();
      y = 44;
    }
  };

  const addHeading = (title: string) => {
    ensureSpace(28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 40, y);
    y += 16;
  };

  const addLine = (label: string, value: string) => {
    ensureSpace(18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, 48, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(value, pageW - 48, y, { align: 'right' });
    y += 15;
  };

  // Header Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(8, 145, 178);
  doc.text('FreshSave Local Admin Summary Report', 40, y);
  y += 17;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()} · Source: Browser localStorage`, 40, y);
  y += 22;

  // Section 1: Visual Circle & Line Charts
  addHeading('1. Visual Analytics (Circle & Line Charts)');
  ensureSpace(165);

  const chartBoxY = y;
  // Left chart box: Circle (Donut) Chart
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, chartBoxY, 248, 142, 4, 4, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Inventory & Outcome Circle Chart', 50, chartBoxY + 15);

  drawVectorDonutChart(doc, 96, chartBoxY + 78, 38, 20, input.circleSlices);

  const totalSliceVal = input.circleSlices.reduce((s, x) => s + x.value, 0);
  let legY = chartBoxY + 42;
  for (const slice of input.circleSlices) {
    doc.setFillColor(slice.rgb[0], slice.rgb[1], slice.rgb[2]);
    doc.rect(146, legY - 6, 7, 7, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const pct = totalSliceVal > 0 ? Math.round((slice.value / totalSliceVal) * 100) : 0;
    doc.text(`${slice.label}: ${slice.value} (${pct}%)`, 157, legY);
    legY += 17;
  }

  // Right chart box: Line Chart
  drawVectorLineChart(doc, 298, chartBoxY, 257, 142, input.linePoints);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Activity Trend Line Chart', 308, chartBoxY + 15);

  // Line chart legend
  const lineLegend: Array<{ label: string; rgb: [number, number, number]; x: number }> = [
    { label: 'Added', rgb: [6, 182, 212], x: 430 },
    { label: 'Consumed', rgb: [16, 185, 129], x: 470 },
    { label: 'Wasted', rgb: [244, 63, 94], x: 520 },
  ];
  for (const item of lineLegend) {
    doc.setFillColor(item.rgb[0], item.rgb[1], item.rgb[2]);
    doc.circle(item.x, chartBoxY + 12.5, 2.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(item.label, item.x + 5, chartBoxY + 14.5);
  }

  y = chartBoxY + 158;

  // Section 2: Inventory & Activity KPIs
  addHeading('2. Grocery Inventory & Activity Summary');
  addLine('Total Groceries Recorded', String(input.totalGroceriesCount));
  addLine('Active Groceries in Inventory', String(input.activeGroceriesCount));
  addLine('Active Fresh (> 3 days)', String(input.freshActiveCount));
  addLine('Active Expiring Soon (0-3 days)', String(input.expiringSoonActiveCount));
  addLine('Active Expired Items', String(input.expiredActiveCount));
  addLine('Active Without Expiry Date', String(input.noExpiryActiveCount));
  addLine('Consumed Log Entries', String(input.summary.consumedCount));
  addLine('Wasted Log Entries', String(input.summary.wastedCount));
  y += 8;

  // Section 3: Savings & Financial Summary
  addHeading('3. Savings & Financial Summary (INR)');
  addLine('Total Money Saved Before Expiry', `INR ${input.summary.totalMoneySaved.toFixed(2)}`);
  addLine('Food Waste Prevented Value', `INR ${input.summary.foodWastePreventedValue.toFixed(2)}`);
  addLine('Total Recorded Spending', `INR ${input.summary.totalSpendingRecorded.toFixed(2)}`);
  addLine('Current Active Inventory Value', `INR ${input.summary.currentInventoryValue.toFixed(2)}`);
  addLine('Food Wasted Loss', `INR ${input.summary.totalFoodWastedValue.toFixed(2)}`);
  y += 8;

  // Section 4: Category Breakdown
  addHeading('4. Category Breakdown');
  for (const cat of input.categoryBreakdown) {
    addLine(
      cat.category,
      `Active: ${cat.activeCount} | Consumed: ${cat.consumedCount} | Wasted: ${cat.wastedCount}`
    );
  }
  y += 8;

  // Section 5: Recent Activity Snapshot
  addHeading('5. Recent Activity Snapshot');
  if (input.recentActivities.length === 0) {
    addLine('Recent Activity', 'No local FreshSave activity recorded yet.');
  } else {
    for (const act of input.recentActivities.slice(0, 12)) {
      addLine(
        `[${act.kind.toUpperCase()}] ${act.groceryName} (${formatQty(act.quantity)} ${act.unit})`,
        `${act.detailText} · ${new Date(act.timestampIso).toLocaleDateString()}`
      );
    }
  }

  return doc;
}
