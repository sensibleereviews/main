// Sensiblee widgets — stat cards, charts (recharts), QR pattern, funnel
"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, cn } from "./deps";

export function StatCard({
  label,
  value,
  delta,
  hint,
  icon,
  accent = "mint",
}: {
  label: string;
  value: string;
  delta?: string;
  hint?: string;
  icon?: React.ReactNode;
  accent?: "mint" | "amber" | "slate" | "coral";
}) {
  const accents: Record<string, string> = {
    mint: "bg-mint-soft text-mint-deep",
    amber: "bg-amber-soft text-amber-deep",
    slate: "bg-brand/5 text-brand",
    coral: "bg-red-50 text-red-600",
  };
  const positive = delta?.startsWith("+");
  return (
    <div className="rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-[0_6px_20px_rgba(16,24,40,0.07)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accents[accent])}>{icon}</span>}
          <span className="text-[13px] font-medium text-neutral-500">{label}</span>
        </div>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
              positive ? "bg-mint-soft text-mint-deep" : "bg-red-50 text-red-600"
            )}
          >
            {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {delta}
          </span>
        )}
      </div>
      <div className="mt-3 text-[26px] font-bold leading-none tracking-tight text-brand">{value}</div>
      {hint && <div className="mt-1.5 text-xs text-neutral-400">{hint}</div>}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-brand">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-neutral-400">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  boxShadow: "0 8px 24px rgba(16,24,40,0.12)",
  fontSize: 12,
  padding: "8px 12px",
};

export function RatingTrendChart({ data }: { data: { w: string; rating: number; volume: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="mintFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#88d6a0" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#88d6a0" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 6" stroke="#eef0f2" vertical={false} />
        <XAxis dataKey="w" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="l" domain={[3.8, 5]} ticks={[4, 4.5, 5]} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: "#c4c9d0" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area yAxisId="l" type="monotone" dataKey="rating" stroke="#3f9163" strokeWidth={2.5} fill="url(#mintFill)" name="Avg rating" dot={false} activeDot={{ r: 4, fill: "#3f9163" }} />
        <Bar yAxisId="r" dataKey="volume" fill="#1f2937" opacity={0.08} radius={[4, 4, 0, 0]} barSize={16} name="Reviews / wk" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function SentimentDonut({ data, avgRating }: { data: { name: string; value: number; color: string }[]; avgRating?: number }) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[150px] w-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={46} outerRadius={70} paddingAngle={3} strokeWidth={0} cornerRadius={6}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-brand">{avgRating ? avgRating.toFixed(2) : "—"}</span>
          <span className="text-[10px] uppercase tracking-wide text-neutral-400">avg rating</span>
        </div>
      </div>
      <div className="flex-1 space-y-2.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between gap-2 text-[13px]">
            <span className="flex items-center gap-2 text-neutral-600">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
              {d.name}
            </span>
            <span className="font-semibold text-brand">{d.value}%</span>
          </div>
        ))}
        <p className="pt-1 text-[11px] leading-relaxed text-neutral-400">
          Classified on-device by the AI worker on every sync.
        </p>
      </div>
    </div>
  );
}

export function FunnelBars({ data }: { data: { stage: string; value: number; pct: number }[] }) {
  return (
    <div className="space-y-3">
      {data.map((f, i) => (
        <div key={f.stage}>
          <div className="mb-1 flex items-center justify-between text-[12.5px]">
            <span className="text-neutral-600">{f.stage}</span>
            <span className="font-semibold text-brand">
              {f.value.toLocaleString("en-IN")}
              <span className="ml-1.5 text-[11px] font-medium text-neutral-400">{f.pct}%</span>
            </span>
          </div>
          <div className="h-6 overflow-hidden rounded-lg bg-surface">
            <div
              className={cn(
                "flex h-full items-center rounded-lg pl-2 text-[10px] font-bold text-white transition-all",
                i === 0 && "bg-brand",
                i === 1 && "bg-brand/75",
                i === 2 && "bg-mint-deep",
                i === 3 && "bg-mint"
              )}
              style={{ width: `${Math.max(f.pct, 9)}%` }}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-6 animate-pulse rounded-lg bg-surface" />)}
        </div>
      )}
    </div>
  );
}

export function LocationCompareChart({ data }: { data: { name: string; rating: number; responses: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -22 }} barCategoryGap="28%">
        <CartesianGrid strokeDasharray="4 6" stroke="#eef0f2" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
        <YAxis domain={[3.5, 5]} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(31,41,55,0.04)" }} />
        <Bar dataKey="rating" radius={[6, 6, 0, 0]} barSize={38} name="Rating">
          {data.map((d, i) => (
            <Cell key={i} fill={i === 2 ? "#f59e0b" : "#3f9163"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MrrChart({ data }: { data: { m: string; mrr: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -14 }}>
        <defs>
          <linearGradient id="slateFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#88d6a0" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#88d6a0" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 6" stroke="rgba(255,255,255,0.09)" vertical={false} />
        <XAxis dataKey="m" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.45)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.45)" }} axisLine={false} tickLine={false} unit="L" />
        <Tooltip
          contentStyle={{ ...tooltipStyle, background: "#111827", border: "1px solid #374151", color: "#f9fafb" }}
          formatter={(v: number) => [`₹${v}L`, "MRR"]}
        />
        <Area type="monotone" dataKey="mrr" stroke="#88d6a0" strokeWidth={2.5} fill="url(#slateFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Deterministic stylised QR pattern (design placeholder — production uses a real QR encoder)
function buildQrCells(size: number, n: number, seed: number) {
  const cell = size / n;
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const isFinder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const cells: { x: number; y: number }[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (isFinder(r, c)) continue;
      if (rand() > 0.52) cells.push({ x: c * cell, y: r * cell });
    }
  }
  return { cell, cells };
}

export function QrPattern({ size = 148, seed = 7 }: { size?: number; seed?: number }) {
  const n = 21;
  const { cell, cells } = buildQrCells(size, n, seed);
  const finder = (x: number, y: number, key: string) => (
    <g key={key}>
      <rect x={x} y={y} width={cell * 7} height={cell * 7} rx={cell} fill="#1f2937" />
      <rect x={x + cell} y={y + cell} width={cell * 5} height={cell * 5} rx={cell * 0.7} fill="#fefcf5" />
      <rect x={x + cell * 2} y={y + cell * 2} width={cell * 3} height={cell * 3} rx={cell * 0.5} fill="#1f2937" />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Table QR code">
      <rect width={size} height={size} rx={10} fill="#fefcf5" />
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={cell * 0.92} height={cell * 0.92} rx={cell * 0.28} fill="#1f2937" />
      ))}
      {finder(0, 0, "tl")}
      {finder(size - cell * 7, 0, "tr")}
      {finder(0, size - cell * 7, "bl")}
      <rect x={size / 2 - cell * 2.5} y={size / 2 - cell * 2.5} width={cell * 5} height={cell * 5} rx={8} fill="#fefcf5" />
      <circle cx={size / 2} cy={size / 2} r={cell * 1.7} fill="#88d6a0" />
      <circle cx={size / 2 + cell * 0.8} cy={size / 2} r={cell * 0.42} fill="#fef3c7" />
    </svg>
  );
}
