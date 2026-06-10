'use client';

import { ANALYTICS_STRINGS } from '@/config/admin-strings';
import type { FunnelStage } from '@/lib/admin/analytics-service';

const BAR_HEIGHT = 36;
const ROW_GAP = 14;
const CHART_WIDTH = 560;
const LABEL_WIDTH = 150;

/** Pure SVG funnel — no chart library (bundle size + accessibility control). */
export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map((s) => s.count), 0);

  if (stages.length === 0 || max === 0) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">
        {ANALYTICS_STRINGS.FUNNEL_EMPTY}
      </p>
    );
  }

  const height = stages.length * (BAR_HEIGHT + ROW_GAP);
  const barAreaWidth = CHART_WIDTH - LABEL_WIDTH;

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${height}`}
      className="w-full"
      role="img"
      aria-label={ANALYTICS_STRINGS.FUNNEL_TITLE}
    >
      {stages.map((s, i) => {
        const y = i * (BAR_HEIGHT + ROW_GAP);
        const width = Math.max((s.count / max) * barAreaWidth, 2);
        return (
          <g key={s.stage} aria-label={`${s.stage}: ${s.count}`}>
            <text
              x={0}
              y={y + BAR_HEIGHT / 2 + 4}
              className="fill-slate-600 dark:fill-slate-300"
              fontSize={12}
            >
              {s.stage}
            </text>
            <rect
              x={LABEL_WIDTH}
              y={y}
              width={width}
              height={BAR_HEIGHT}
              rx={4}
              className="fill-emerald-500"
            />
            <text
              x={LABEL_WIDTH + width + 8}
              y={y + BAR_HEIGHT / 2 + 4}
              className="fill-slate-900 dark:fill-slate-100"
              fontSize={12}
              fontWeight={600}
            >
              {s.count}
              {i > 0 && s.dropOffPct > 0
                ? `  (\u2212${s.dropOffPct}% ${ANALYTICS_STRINGS.FUNNEL_DROP_PREFIX})`
                : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
