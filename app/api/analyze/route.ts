import { NextRequest, NextResponse } from "next/server";

interface Row {
  date: string;
  spend: number;
  clicks: number;
  conversions: number;
}

interface AnalysisResult {
  conversionRate: number[];
  ctr: number[];
  cpa: number[];
  dayOfWeekAvg: { day: string; convRate: number }[];
  anomalies: number[];
  recentVsPastConvRate: { recent: number; past: number; changePct: number };
  recentVsPastCTR: { recent: number; past: number; changePct: number };
}

function analyzeData(rows: Row[]): AnalysisResult {
  const conversionRate = rows.map((r) =>
    r.clicks > 0 ? (r.conversions / r.clicks) * 100 : 0
  );
  const ctr = rows.map((r) => (r.spend > 0 ? r.clicks / r.spend : 0));
  const cpa = rows.map((r) =>
    r.conversions > 0 ? r.spend / r.conversions : 0
  );

  // 요일별 평균 전환율
  const dayMap: { [key: number]: number[] } = {};
  rows.forEach((r, i) => {
    const d = new Date(r.date).getDay();
    if (!dayMap[d]) dayMap[d] = [];
    dayMap[d].push(conversionRate[i]);
  });
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const dayOfWeekAvg = Object.entries(dayMap).map(([d, vals]) => ({
    day: dayNames[Number(d)],
    convRate: vals.reduce((a, b) => a + b, 0) / vals.length,
  }));

  // 이상치 탐지 (평균 ± 2 표준편차)
  const mean = conversionRate.reduce((a, b) => a + b, 0) / conversionRate.length;
  const std = Math.sqrt(
    conversionRate.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / conversionRate.length
  );
  const anomalies = conversionRate
    .map((v, i) => (Math.abs(v - mean) > 2 * std ? i : -1))
    .filter((i) => i !== -1);

  // 최근 절반 vs 이전 절반 비교
  const half = Math.floor(rows.length / 2);
  const pastConv = conversionRate.slice(0, half);
  const recentConv = conversionRate.slice(half);
  const pastCTR = ctr.slice(0, half);
  const recentCTR = ctr.slice(half);

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const pastConvAvg = avg(pastConv);
  const recentConvAvg = avg(recentConv);
  const pastCTRAvg = avg(pastCTR);
  const recentCTRAvg = avg(recentCTR);

  return {
    conversionRate,
    ctr,
    cpa,
    dayOfWeekAvg,
    anomalies,
    recentVsPastConvRate: {
      recent: recentConvAvg,
      past: pastConvAvg,
      changePct: pastConvAvg > 0 ? ((recentConvAvg - pastConvAvg) / pastConvAvg) * 100 : 0,
    },
    recentVsPastCTR: {
      recent: recentCTRAvg,
      past: pastCTRAvg,
      changePct: pastCTRAvg > 0 ? ((recentCTRAvg - pastCTRAvg) / pastCTRAvg) * 100 : 0,
    },
  };
}

function generateInsight(analysis: AnalysisResult, bestDay: { day: string; convRate: number }): string {
  const { recentVsPastConvRate, recentVsPastCTR, anomalies, cpa } = analysis;
  const convChange = recentVsPastConvRate.changePct;
  const ctrChange = recentVsPastCTR.changePct;
  const avgCPA = cpa.filter((v) => v > 0).reduce((a, b) => a + b, 0) / cpa.filter((v) => v > 0).length;

  const convTrend =
    convChange > 5 ? "뚜렷한 상승세"
    : convChange > 0 ? "소폭 개선"
    : convChange > -5 ? "소폭 하락"
    : "뚜렷한 하락세";

  const ctrTrend =
    ctrChange > 5 ? "효율이 높아지고 있어"
    : ctrChange > 0 ? "광고 효율이 소폭 개선되고 있어"
    : ctrChange > -5 ? "광고 효율이 소폭 낮아지고 있어"
    : "광고 효율이 눈에 띄게 떨어지고 있어";

  const anomalyText =
    anomalies.length === 0
      ? "데이터 전반에 걸쳐 이상치는 발견되지 않았으며, 비교적 안정적인 흐름을 유지하고 있습니다."
      : `${anomalies.length}개의 이상치가 감지되었습니다(${anomalies.map((i) => `${i + 1}행`).join(", ")}). 해당 날짜의 외부 요인(프로모션, 시즌 이벤트 등)을 확인해 성공·실패 원인을 분석할 필요가 있습니다.`;

  const actionForConv =
    convChange < 0
      ? "랜딩페이지 A/B 테스트를 진행해 전환 흐름의 병목 구간을 찾아보세요."
      : "현재 전환율이 개선 중이므로, 성과가 높은 소재와 타겟을 중심으로 예산을 집중 투입하세요.";

  const actionForCTR =
    ctrChange < 0
      ? "광고 소재를 교체하거나 타겟 세그먼트를 재조정해 클릭률을 회복시키세요."
      : "현재 CTR이 개선 추세이므로, 효과적인 소재 패턴을 분석해 유사 광고에 적용하세요.";

  return `**핵심 진단**
최근 기간 전환율이 ${convTrend}를 보이고 있으며(${convChange > 0 ? "+" : ""}${convChange.toFixed(1)}%), CTR도 ${ctrTrend}(${ctrChange > 0 ? "+" : ""}${ctrChange.toFixed(1)}%). ${anomalyText}

**주목할 포인트**
• 전환율: 과거 평균 ${recentVsPastConvRate.past.toFixed(2)}% → 최근 ${recentVsPastConvRate.recent.toFixed(2)}%로 ${Math.abs(convChange).toFixed(1)}%p ${convChange >= 0 ? "상승" : "하락"} — 캠페인 효과 변화를 주시하세요.
• 최고 성과 요일: ${bestDay.day}요일(전환율 ${bestDay.convRate.toFixed(2)}%) — 이 요일에 예산과 입찰가를 높이면 효율을 끌어올릴 수 있습니다.
• 평균 CPA: ${Math.round(avgCPA).toLocaleString()}원 — ${avgCPA > 50000 ? "CPA가 높은 편으로 전환 퍼널 최적화가 필요합니다." : "CPA가 양호한 수준으로, 현재 타겟·소재 전략을 유지하세요."}

**액션 플랜**
1. (즉시) ${bestDay.day}요일 예산 비중을 10~20% 높이고, 타 요일 대비 성과 차이를 1주일간 모니터링하세요.
2. (이번 주) ${actionForCTR}
3. (다음 달) ${actionForConv} 이후 전환율 변화 데이터를 축적해 최적 소재·타겟 조합을 정립하세요.`;
}

export async function POST(req: NextRequest) {
  try {
    const { rows }: { rows: Row[] } = await req.json();

    if (!rows || rows.length < 4) {
      return NextResponse.json({ error: "데이터가 너무 적습니다 (최소 4행)" }, { status: 400 });
    }

    const analysis = analyzeData(rows);

    const bestDay = analysis.dayOfWeekAvg.reduce((a, b) =>
      a.convRate > b.convRate ? a : b
    );

    const insightText = generateInsight(analysis, bestDay);

    return NextResponse.json({ analysis, insight: insightText });
  } catch (error) {
    console.error("Analyze error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `분석 중 오류: ${msg}` }, { status: 500 });
  }
}
