# 마케팅 인사이트 생성기

광고 성과 CSV를 업로드하면 통계 분석 + 실무 인사이트를 자동으로 생성해주는 미니 웹앱입니다.

🔗 **배포 URL**: [mini-webapp on Vercel](https://mini-webapp-mipigirl7.vercel.app)

---

## 주요 기능

- **CSV 업로드** — `date · spend · clicks · conversions` 컬럼 기반 자동 파싱
- **통계 자동 분석**
  - 전환율(CVR) 추세 시각화
  - 요일별 평균 전환율 비교
  - CPA(전환당 비용) 추이 차트
  - 이상치 탐지 (평균 ±2σ 기반)
  - 최근 vs 이전 기간 성과 비교
- **인사이트 & 액션 플랜 생성** — 핵심 진단 / 주목할 포인트 / 액션 플랜 3단 구성

## 기술 스택

| 분류 | 사용 기술 |
|------|----------|
| 프레임워크 | Next.js 16 (App Router, TypeScript) |
| 스타일 | Tailwind CSS |
| 차트 | Recharts |
| CSV 파싱 | PapaParse |
| 배포 | Vercel |

## 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:3000` 에서 확인

## 데이터 형식

CSV 파일에 아래 컬럼이 있으면 바로 분석 가능합니다:

```csv
date,spend,clicks,conversions
2024-01-01,50000,420,18
2024-01-02,48000,390,20
...
```

한국어 컬럼명(`날짜`, `광고비`, `클릭`, `전환`)도 지원합니다.

---

> Next.js 포트폴리오 미니 프로젝트 — 함다연
