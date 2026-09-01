import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartDef } from "@/config/types";
import { buildChartData } from "@/lib/rows";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = [
  "var(--primary)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function ChartCard({
  def,
  seedKey,
  loading,
  data: realData,
}: {
  def: ChartDef;
  seedKey: string;
  loading?: boolean;
  /** Real, already-fetched rows shaped `{name, ...seriesValues}` — when provided, no fake data is generated. */
  data?: Array<Record<string, string | number>>;
}) {
  const fallback = useMemo(
    () => buildChartData(def.categories, def.dataKeys, `${seedKey}-${def.title}`),
    [def, seedKey],
  );
  const data = realData ?? fallback;

  const axis = { stroke: "var(--muted-foreground)", fontSize: 12 };
  const tooltip = (
    <Tooltip
      contentStyle={{
        background: "var(--popover)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        color: "var(--popover-foreground)",
        fontSize: 12,
      }}
    />
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{def.title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[260px] pt-2">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {def.type === "bar" ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" {...axis} tickLine={false} axisLine={false} />
                <YAxis {...axis} tickLine={false} axisLine={false} width={38} />
                {tooltip}
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {def.dataKeys.map((k, i) => (
                  <Bar
                    key={k}
                    dataKey={k}
                    fill={COLORS[i % COLORS.length]}
                    radius={[6, 6, 0, 0]}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            ) : def.type === "line" ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" {...axis} tickLine={false} axisLine={false} />
                <YAxis {...axis} tickLine={false} axisLine={false} width={38} />
                {tooltip}
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {def.dataKeys.map((k, i) => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            ) : def.type === "pie" ? (
              <PieChart>
                {tooltip}
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Pie
                  data={data}
                  dataKey={def.dataKeys[0] as string}
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  isAnimationActive={false}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            ) : (
              <AreaChart data={data}>
                <defs>
                  {def.dataKeys.map((k, i) => (
                    <linearGradient key={k} id={`g-${seedKey}-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.45} />
                      <stop
                        offset="100%"
                        stopColor={COLORS[i % COLORS.length]}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" {...axis} tickLine={false} axisLine={false} />
                <YAxis {...axis} tickLine={false} axisLine={false} width={38} />
                {tooltip}
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {def.dataKeys.map((k, i) => (
                  <Area
                    key={k}
                    type="monotone"
                    dataKey={k}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    fill={`url(#g-${seedKey}-${k})`}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
