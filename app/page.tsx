"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { ConversionTrendChart, DayOfWeekChart, CPAChart } from "./components/Charts";

interface Row {
  date: string;
  spend: number;
  clicks: number;
  conversions: number;
}

interface Analysis {
  conversionRate: number[];
  ctr: number[];
  cpa: number[];
  dayOfWeekAvg: { day: string; convRate: number }[];
  anomalies: number[];
  recentVsPastConvRate: { recent: number; past: number; changePct: number };
  recentVsPastCTR: { recent: number; past: number; changePct: number };
}

const SAMPLE_CSV = `date,spend,clicks,conversions
2024-01-01,50000,420,18
2024-01-02,48000,390,20
2024-01-03,52000,510,22
2024-01-04,61000,580,19
2024-01-05,55000,460,21
2024-01-06,70000,620,28
2024-01-07,45000,350,14
2024-01-08,53000,440,17
2024-01-09,57000,480,19
2024-01-10,60000,500,16
2024-01-11,58000,490,15
2024-01-12,62000,520,14
2024-01-13,75000,630,12
2024-01-14,48000,380,11`;

function parseInsightSections(text: string) {
  const config: Record<string, { icon: string; bg: string; border: string; titleColor: string }> = {
    "핵심 진단": { icon: "🎯", bg: "bg-rose-50", border: "border-rose-200", titleColor: "text-rose-800" },
    "주목할 포인트": { icon: "💡", bg: "bg-amber-50", border: "border-amber-200", titleColor: "text-amber-800" },
    "액션 플랜": { icon: "🚀", bg: "bg-indigo-50", border: "border-indigo-200", titleColor: "text-indigo-800" },
  };

  const sections: { title: string; content: string; icon: string; bg: string; border: string; titleColor: string }[] = [];
  const parts = text.split(/\*\*([^*]+)\*\*/);

  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].trim();
    const content = parts[i + 1]?.trim() || "";
    const c = config[title] ?? { icon: "📌", bg: "bg-gray-50", border: "border-gray-200", titleColor: "text-gray-800" };
    sections.push({ title, content, ...c });
  }
  return sections;
}

function InsightCard({ section }: { section: ReturnType<typeof parseInsightSections>[0] }) {
  const lines = section.content.split("\n").filter((l) => l.trim());

  return (
    <div className={`rounded-2xl border ${section.border} ${section.bg} p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{section.icon}</span>
        <h4 className={`font-bold text-sm ${section.titleColor}`}>{section.title}</h4>
      </div>
      <div className="space-y-2.5">
        {lines.map((line, i) => {
          if (line.startsWith("•")) {
            const parts = line.slice(1).trim().split(/(?<=전환율|CTR|요일|CPA|예산|소재)[\s—:]/);
            const text = line.slice(1).trim();
            return (
              <div key={i} className="flex gap-2.5 text-sm text-gray-700 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 flex-shrink-0 mt-2" />
                <span>{text}</span>
              </div>
            );
          }
          const numberedMatch = line.match(/^(\d+)\.\s*(\([^)]+\))?\s*(.*)/);
          if (numberedMatch) {
            const [, num, tag, rest] = numberedMatch;
            return (
              <div key={i} className="flex gap-3 text-sm text-gray-700 leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {num}
                </span>
                <span>
                  {tag && (
                    <span className="inline-block mr-1.5 px-1.5 py-0.5 text-xs font-semibold rounded bg-indigo-100 text-indigo-700 align-baseline">
                      {tag.replace(/[()]/g, "")}
                    </span>
                  )}
                  {rest}
                </span>
              </div>
            );
          }
          return (
            <p key={i} className="text-sm text-gray-700 leading-relaxed">
              {line}
            </p>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ analysis: Analysis; insight: string } | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function parseCSV(text: string): Row[] {
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    return parsed.data
      .map((r) => ({
        date: r.date || r["날짜"] || "",
        spend: parseFloat(r.spend || r["광고비"] || "0"),
        clicks: parseFloat(r.clicks || r["클릭"] || "0"),
        conversions: parseFloat(r.conversions || r["전환"] || "0"),
      }))
      .filter((r) => r.date);
  }

  function handleFile(file: File) {
    setFileName(file.name);
    setResult(null);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 4) {
        setError("데이터가 너무 적습니다. 최소 4행 이상 필요해요.");
        return;
      }
      setRows(parsed);
    };
    reader.readAsText(file);
  }

  function loadSample() {
    setFileName("sample_data.csv");
    setResult(null);
    setError("");
    setRows(parseCSV(SAMPLE_CSV));
  }

  async function analyze() {
    if (rows.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "분석 실패");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const bestDay = result?.analysis.dayOfWeekAvg.reduce((a, b) => (a.convRate > b.convRate ? a : b));

  const statCards = result
    ? [
        {
          label: "최근 전환율",
          value: `${result.analysis.recentVsPastConvRate.recent.toFixed(2)}%`,
          sub: `이전 ${result.analysis.recentVsPastConvRate.past.toFixed(2)}%`,
          change: result.analysis.recentVsPastConvRate.changePct,
          icon: "📈",
          iconBg: "bg-indigo-100",
        },
        {
          label: "최근 CTR",
          value: result.analysis.recentVsPastCTR.recent.toFixed(4),
          sub: `이전 ${result.analysis.recentVsPastCTR.past.toFixed(4)}`,
          change: result.analysis.recentVsPastCTR.changePct,
          icon: "🖱️",
          iconBg: "bg-blue-100",
        },
        {
          label: "이상치 감지",
          value: `${result.analysis.anomalies.length}건`,
          sub: result.analysis.anomalies.length === 0 ? "안정적인 흐름" : "원인 분석 필요",
          change: null,
          icon: result.analysis.anomalies.length === 0 ? "✅" : "⚠️",
          iconBg: result.analysis.anomalies.length === 0 ? "bg-emerald-100" : "bg-amber-100",
        },
        {
          label: "최고 성과 요일",
          value: bestDay ? `${bestDay.day}요일` : "-",
          sub: bestDay ? `전환율 ${bestDay.convRate.toFixed(2)}%` : "",
          change: null,
          icon: "🏆",
          iconBg: "bg-yellow-100",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 backdrop-blur-sm bg-white/90">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm">
              M
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">마케팅 인사이트 생성기</h1>
              <p className="text-xs text-gray-400">광고 데이터 → 통계 분석 → 액션 플랜</p>
            </div>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">Beta</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* 히어로 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200 mb-2">Marketing Analytics</p>
            <h2 className="text-xl font-bold mb-2 leading-snug">광고 성과 데이터를 올리면<br />실무 인사이트를 바로 드려요</h2>
            <p className="text-sm text-indigo-200 mb-5">전환율 추세 · 요일별 패턴 · CPA 변화 · 이상치 탐지까지<br />CSV 하나로 완전 자동 분석</p>
            <div className="flex gap-6 text-xs text-indigo-100">
              {["CSV 업로드", "통계 자동 분석", "액션 플랜 생성"].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-xs">{i + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 업로드 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-5 h-5 bg-gray-100 rounded-md flex items-center justify-center text-xs">📂</span>
            데이터 업로드
          </h2>

          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              <span className="text-xl">📊</span>
            </div>
            <p className="text-sm font-medium text-gray-700">CSV 파일 드래그 또는 클릭해서 업로드</p>
            <p className="text-xs text-gray-400 mt-1">필수 컬럼: date · spend · clicks · conversions</p>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={loadSample}
              className="text-xs text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors font-medium"
            >
              샘플 데이터로 먼저 해보기
            </button>
            {fileName && (
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {fileName} ({rows.length}행)
              </span>
            )}
          </div>

          {rows.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100">
              <table className="text-xs w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {["날짜", "광고비", "클릭", "전환"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-gray-500 font-semibold tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 text-gray-600">{r.date}</td>
                      <td className="px-4 py-2.5 text-gray-800 font-medium">{r.spend.toLocaleString()}원</td>
                      <td className="px-4 py-2.5 text-gray-800">{r.clicks.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-gray-800">{r.conversions}</td>
                    </tr>
                  ))}
                  {rows.length > 5 && (
                    <tr className="border-t border-gray-100">
                      <td colSpan={4} className="px-4 py-2.5 text-gray-400 text-center">
                        ... 외 {rows.length - 5}행 더 있음
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <span className="flex-shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={analyze}
            disabled={rows.length === 0 || loading}
            className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl py-3 transition-all text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-indigo-200 hover:shadow-md"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                분석 중...
              </>
            ) : (
              <>인사이트 생성하기 →</>
            )}
          </button>
        </div>

        {/* 결과 */}
        {result && (
          <>
            {/* KPI 카드 */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {statCards.map((card) => (
                <div key={card.label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-7 h-7 rounded-lg ${card.iconBg} flex items-center justify-center text-sm mb-3`}>
                    {card.icon}
                  </div>
                  <p className="text-xs text-gray-500 mb-0.5">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900">{card.value}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {card.change !== null ? (
                      <span
                        className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                          card.change >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {card.change >= 0 ? "▲" : "▼"} {Math.abs(card.change).toFixed(1)}%
                      </span>
                    ) : null}
                    <span className="text-xs text-gray-400">{card.sub}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 차트 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-800">전환율 추세</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    이상치{" "}
                    <span className="inline-block w-2 h-2 rounded-full bg-red-400 align-middle" /> 빨간 점으로 표시
                  </p>
                </div>
                <ConversionTrendChart
                  dates={rows.map((r) => r.date)}
                  values={result.analysis.conversionRate}
                  anomalies={result.analysis.anomalies}
                />
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-800">요일별 평균 전환율</h3>
                  <p className="text-xs text-gray-400 mt-0.5">최근 기간 기준</p>
                </div>
                <DayOfWeekChart data={result.analysis.dayOfWeekAvg} />
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm sm:col-span-2">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-800">CPA 추이</h3>
                  <p className="text-xs text-gray-400 mt-0.5">전환당 비용 (낮을수록 효율적)</p>
                </div>
                <CPAChart dates={rows.map((r) => r.date)} values={result.analysis.cpa} />
              </div>
            </div>

            {/* 인사이트 — 섹션 카드로 렌더링 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">AI</div>
                <h3 className="text-sm font-semibold text-gray-900">마케팅 인사이트 & 액션 플랜</h3>
              </div>
              <div className="space-y-3">
                {parseInsightSections(result.insight).map((section) => (
                  <InsightCard key={section.title} section={section} />
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="max-w-4xl mx-auto px-6 py-6 text-center text-xs text-gray-400">
        마케팅 인사이트 생성기 · 통계 기반 자동 분석
      </footer>
    </div>
  );
}
