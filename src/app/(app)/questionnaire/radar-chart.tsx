'use client';

import { CPP_DOMAINS, RADAR_THRESHOLDS } from '@/config/strings';
import { COLORS } from '@/config/colors';

interface RadarChartProps {
  scores: Record<string, number>;
}

const DOMAIN_ENTRIES = Object.values(CPP_DOMAINS);
const DOMAIN_KEYS = DOMAIN_ENTRIES.map((d) => d.code);
const CHART_SIZE = 240;
const CENTER = CHART_SIZE / 2;
const RADIUS = 90;

function polarToCartesian(angle: number, radius: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  };
}

function getColor(score: number): string {
  if (score >= RADAR_THRESHOLDS.GREEN_MIN) return COLORS.radar.green;
  if (score >= RADAR_THRESHOLDS.AMBER_MIN) return COLORS.radar.amber;
  return COLORS.radar.red;
}

export function RadarChart({ scores }: RadarChartProps) {
  const angleStep = 360 / DOMAIN_KEYS.length;

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const dataPoints = DOMAIN_KEYS.map((key, i) => {
    const score = scores[key] ?? 0;
    const angle = i * angleStep;
    const r = (score / 100) * RADIUS;
    return polarToCartesian(angle, r);
  });

  const dataPath =
    dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  const avgScore =
    DOMAIN_KEYS.reduce((sum, key) => sum + (scores[key] ?? 0), 0) / DOMAIN_KEYS.length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-slate-700">
      <svg viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`} className="text-slate-300 dark:text-slate-600 w-full max-w-[240px] mx-auto">
        {gridLevels.map((level) => {
          const gridPoints = DOMAIN_KEYS.map((_, i) =>
            polarToCartesian(i * angleStep, RADIUS * level),
          );
          const gridPath =
            gridPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
          return <path key={level} d={gridPath} fill="none" stroke="currentColor" strokeWidth="0.5" />;
        })}

        {DOMAIN_KEYS.map((_, i) => {
          const end = polarToCartesian(i * angleStep, RADIUS);
          return (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={end.x}
              y2={end.y}
              stroke="currentColor"
              strokeWidth="0.5"
            />
          );
        })}

        <path
          d={dataPath}
          fill={getColor(avgScore)}
          fillOpacity={0.2}
          stroke={getColor(avgScore)}
          strokeWidth="2"
        />

        {DOMAIN_KEYS.map((key, i) => {
          const labelPos = polarToCartesian(i * angleStep, RADIUS + 18);
          const score = scores[key] ?? 100;
          return (
            <text
              key={key}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[7px] font-medium"
              fill={getColor(score)}
            >
              {key.replace('CPP-0', '')}
            </text>
          );
        })}
      </svg>

      <div className="mt-3 text-center">
        <span className="text-2xl font-bold" style={{ color: getColor(avgScore) }}>
          {Math.round(avgScore)}
        </span>
        <span className="text-sm text-gray-500 dark:text-slate-400 ml-1">/ 100</span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
        {DOMAIN_ENTRIES.map((domain) => {
          const score = scores[domain.code] ?? 0;
          return (
            <div key={domain.code} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getColor(score) }} />
              <span className="text-gray-600 dark:text-slate-300 truncate">{domain.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
