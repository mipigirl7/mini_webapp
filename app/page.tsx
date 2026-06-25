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

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ analysis: Analysis; insight: string } | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function parseCSV(text: string): Row[] {
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    return parsed.data.map((r) => ({
      date: r.date || r["날짜"] || "",
      spend: parseFloat(r.spend || r["광고비"] || "0"),
      clicks: parseFloat(r.clicks || r["클릭"] || "0"),
      conversions: parseFloat(r.conversions || r["전환"] || "0"),
    })).filter((r) => r.date);
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

  const changeBadge = (pct: number) => {
    const color = pct >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700";
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
        {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">M</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">마케팅 인사이트 생성기</h1>
            <p className="text-xs text-gray-500">광고 데이터 CSV → 통계 분석 → AI 인사이트</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* 히어로 설명 */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
          <h2 className="text-base font-bold text-indigo-900 mb-2">광고 성과 데이터를 올리면 AI가 인사이트를 써드려요</h2>
          <p className="text-sm text-indigo-700 mb-4">날짜별 광고비·클릭·전환 데이터만 있으면 됩니다. 전환율 추세, 요일별 패턴, CPA 변화, 이상치를 자동으로 분석하고 실무에서 바로 쓸 수 있는 액션 플랜을 생성해요.</p>
          <div className="flex flex-wrap gap-4 text-xs text-indigo-600">
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center font-bold">1</span> CSV 파일 업로드</span>
            <span className="text-indigo-300">→</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center font-bold">2</span> 통계 자동 분석</span>
            <span className="text-indigo-300">→</span>
            <span className="flex items-center gap-1.5"><span className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center font-bold">3</span> AI 인사이트 생성</span>
          </div>
        </div>

        {/* 업로드 섹션 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">📂 데이터 업로드</h2>

          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <p className="text-3xl mb-2">📊</p>
            <p className="text-sm text-gray-600 font-medium">CSV 파일을 드래그하거나 클릭해서 업로드</p>
            <p className="text-xs text-gray-400 mt-1">필수 컬럼: date, spend(광고비), clicks(클릭), conversions(전환)</p>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button onClick={loadSample} className="text-xs text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors">
              샘플 데이터로 먼저 해보기
            </button>
            {fileName && (
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                ✓ {fileName} ({rows.length}행)
              </span>
            )}
          </div>

          {rows.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-100">
              <table className="text-xs w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {["날짜", "광고비", "클릭", "전환"].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2">{r.date}</td>
                      <td className="px-3 py-2">{r.spend.toLocaleString()}원</td>
                      <td className="px-3 py-2">{r.clicks.toLocaleString()}</td>
                      <td className="px-3 py-2">{r.conversions}</td>
                    </tr>
                  ))}
                  {rows.length > 5 && (
                    <tr className="border-t border-gray-100">
                      <td colSpan={4} className="px-3 py-2 text-gray-400 text-center">... 외 {rows.length - 5}행</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button
            onClick={analyze}
            disabled={rows.length === 0 || loading}
            className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-semibold rounded-xl py-3 transition-colors text-sm"
          >
            {loading ? "분석 중..." : "인사이트 생성하기 →"}
          </button>
        </div>

        {/* 결과 섹션 */}
        {result && (
          <>
            {/* 요약 카드 */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "최근 전환율", value: `${result.analysis.recentVsPastConvRate.recent.toFixed(2)}%`, change: result.analysis.recentVsPastConvRate.changePct },
                { label: "최근 CTR", value: result.analysis.recentVsPastCTR.recent.toFixed(4), change: result.analysis.recentVsPastCTR.changePct },
                { label: "이상치 발생", value: `${result.analysis.anomalies.length}건`, change: null },
                { label: "최고 성과 요일", value: result.analysis.dayOfWeekAvg.reduce((a, b) => a.convRate > b.convRate ? a : b).day + "요일", change: null },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900">{card.value}</p>
                  {card.change !== null && <div className="mt-1">{changeBadge(card.change)}</div>}
                </div>
              ))}
            </div>

            {/* 차트 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">전환율 추세 <span className="text-xs text-red-400 font-normal">● 이상치</span></h3>
                <ConversionTrendChart
                  dates={rows.map((r) => r.date)}
                  values={result.analysis.conversionRate}
                  anomalies={result.analysis.anomalies}
                />
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">요일별 평균 전환율</h3>
                <DayOfWeekChart data={result.analysis.dayOfWeekAvg} />
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:col-span-2">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">CPA 추이 (전환당 비용)</h3>
                <CPAChart
                  dates={rows.map((r) => r.date)}
                  values={result.analysis.cpa}
                />
              </div>
            </div>

            {/* AI 인사이트 */}
            <div className="bg-white rounded-2xl border border-indigo-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">📋</div>
                <h3 className="text-sm font-semibold text-gray-900">마케팅 인사이트 & 액션 플랜</h3>
              </div>
              <div className="text-sm text-gray-700 leading-7 whitespace-pre-wrap">
                {result.insight}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
