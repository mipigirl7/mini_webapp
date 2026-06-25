"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface ConvTrendProps {
  dates: string[];
  values: number[];
  anomalies: number[];
}

export function ConversionTrendChart({ dates, values, anomalies }: ConvTrendProps) {
  const data = dates.map((date, i) => ({
    date: date.slice(5),
    전환율: parseFloat(values[i].toFixed(2)),
    isAnomaly: anomalies.includes(i),
  }));

  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11 }} unit="%" />
        <Tooltip formatter={(v) => [`${v}%`, "전환율"]} />
        <ReferenceLine y={mean} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: `평균 ${mean.toFixed(1)}%`, fontSize: 10, fill: "#94a3b8" }} />
        <Line type="monotone" dataKey="전환율" stroke="#6366f1" strokeWidth={2} dot={(props) => {
          const { cx, cy, index } = props;
          return anomalies.includes(index)
            ? <circle key={index} cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={1.5} />
            : <circle key={index} cx={cx} cy={cy} r={3} fill="#6366f1" />;
        }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface DayOfWeekProps {
  data: { day: string; convRate: number }[];
}

export function DayOfWeekChart({ data }: DayOfWeekProps) {
  const sorted = [...data].sort((a, b) => {
    const order = ["월", "화", "수", "목", "금", "토", "일"];
    return order.indexOf(a.day) - order.indexOf(b.day);
  });

  const formatted = sorted.map((d) => ({
    ...d,
    convRate: parseFloat(d.convRate.toFixed(2)),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} unit="%" />
        <Tooltip formatter={(v) => [`${v}%`, "평균 전환율"]} />
        <Bar dataKey="convRate" fill="#818cf8" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface CPATrendProps {
  dates: string[];
  values: number[];
}

export function CPAChart({ dates, values }: CPATrendProps) {
  const data = dates.map((date, i) => ({
    date: date.slice(5),
    CPA: parseFloat(values[i].toFixed(0)),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11 }} unit="원" />
        <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}원`, "CPA"]} />
        <Line type="monotone" dataKey="CPA" stroke="#f59e0b" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
