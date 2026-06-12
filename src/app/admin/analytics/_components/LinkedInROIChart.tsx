'use client';

import { ANALYTICS_STRINGS } from '@/config/admin-strings';
import type { WeeklyRoiPoint } from '@/lib/admin/analytics-service';

const CHART_WIDTH = 560;
const CHART_HEIGHT = 160;
const BOTTOM_AXIS = 20;

/** Pure SVG grouped bar chart — posts vs signups per week. */
export function LinkedInROIChart({ points }: { points: WeeklyRoiPoint[] }) {
  const max = Math.max(...points.map((p) => Math.max(p.posts, p.signups)), 0);

  if (points.length === 0 || max === 0) {
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">
        {ANALYTICS_STRINGS.ROI_EMPTY}
      </p>
    );
  }

  const groupWidth = CHART_WIDTH / points.length;
  const barWidth = Math.min(groupWidth / 3, 24);
  const plotHeight = CHART_HEIGHT - BOTTOM_AXIS;

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={ANALYTICS_STRINGS.ROI_TITLE}
      >
        {points.map((p, i) => {
          const x = i * groupWidth + groupWidth / 2;
          const postsH = (p.posts / max) * plotHeight;
          const signupsH = (p.signups / max) * plotHeight;
          return (
            <g
              key={p.weekStart}
              aria-label={`${ANALYTICS_STRINGS.WEEK_PREFIX} ${p.weekStart}: ${p.posts} ${ANALYTICS_STRINGS.ROI_POSTS}, ${p.signups} ${ANALYTICS_STRINGS.ROI_SIGNUPS}`}
            >
              <rect
                x={x - barWidth - 1}
                y={plotHeight - postsH}
                width={barWidth}
                height={Math.max(postsH, p.posts > 0 ? 2 : 0)}
                rx={2}
                className="fill-sky-500"
              />
              <rect
                x={x + 1}
                y={plotHeight - signupsH}
                width={barWidth}
                height={Math.max(signupsH, p.signups > 0 ? 2 : 0)}
                rx={2}
                className="fill-emerald-500"
              />
              <text
                x={x}
                y={CHART_HEIGHT - 6}
                textAnchor="middle"
                fontSize={9}
                className="fill-slate-400 dark:fill-slate-500"
              >
                {p.weekStart.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="w-3 h-3 rounded-sm bg-sky-500 inline-block" />
          {ANALYTICS_STRINGS.ROI_POSTS}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
          {ANALYTICS_STRINGS.ROI_SIGNUPS}
        </span>
        <span className="ml-auto">{ANALYTICS_STRINGS.ROI_SUBTITLE}</span>
      </div>
    </div>
  );
}
