'use client';

import { CPP_DOMAINS, RADAR_THRESHOLDS, QUESTIONNAIRE } from '@/config/strings';
import { COLORS } from '@/config/colors';
import { useCountUp } from './use-count-up';

type RadarSize = 'sm' | 'md' | 'lg';

interface RadarChartProps {
  scores: Record<string, number>;
  size?: RadarSize;
  showLegend?: boolean;
}

const DOMAIN_ENTRIES = Object.values(CPP_DOMAINS);
const DOMAIN_KEYS = DOMAIN_ENTRIES.map((d) => d.code);

const SIZES: Record<RadarSize, { chart: number; radius: number; score: string; label: string }> = {
  sm: { chart: 140, radius: 52, score: 'text-lg', label: 'text-[6px]' },
  md: { chart: 200, radius: 76, score: 'text-xl', label: 'text-[7px]' },
  lg: { chart: 240, radius: 90, score: 'text-2xl', label: 'text-[7px]' },
};

function getColor(score: number): string {
  if (score >= RADAR_THRESHOLDS.GREEN_MIN) return COLORS.radar.green;
  if (score >= RADAR_THRESHOLDS.AMBER_MIN) return COLORS.radar.amber;
  return COLORS.radar.red;
}

export function RadarChart({ scores, size = 'lg', showLegend = true }: RadarChartProps) {
  const { chart, radius, score: scoreText, label: labelText } = SIZES[size];
  const center = chart / 2;
  const angleStep = 360 / DOMAIN_KEYS.length;

  const polarToCartesian = (angle: number, r: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: center + r * Math.cos(rad), y: center + r * Math.sin(rad) };
  };

  const buildPath = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const dataPoints = DOMAIN_KEYS.map((key, i) =>
    polarToCartesian(i * angleStep, ((scores[key] ?? 0) / 100) * radius),
  );
  const dataPath = buildPath(dataPoints);

  const avgScore =
    DOMAIN_KEYS.reduce((sum, key) => sum + (scores[key] ?? 0), 0) / DOMAIN_KEYS.length;
  const displayScore = useCountUp(Math.round(avgScore));

  return (
    <div
      data-testid="radar-chart"
      className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-slate-700"
    >
      <svg
        viewBox={`0 0 ${chart} ${chart}`}
        className="text-slate-300 dark:text-slate-600 w-full mx-auto"
        style={{ maxWidth: chart }}
        role="img"
        aria-label={QUESTIONNAIRE.RADAR_ARIA}
      >
        {gridLevels.map((level) => (
          <path
            key={level}
            d={buildPath(
              DOMAIN_KEYS.map((_, i) => polarToCartesian(i * angleStep, radius * level)),
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
          />
        ))}

        {DOMAIN_KEYS.map((_, i) => {
          const end = polarToCartesian(i * angleStep, radius);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="currentColor"
              strokeWidth="0.5"
            />
          );
        })}

        <path
          className="radar-polygon"
          d={dataPath}
          fill={getColor(avgScore)}
          fillOpacity={0.2}
          stroke={getColor(avgScore)}
          strokeWidth="2"
        />

        {DOMAIN_KEYS.map((key, i) => {
          const labelPos = polarToCartesian(i * angleStep, radius + 14);
          const score = scores[key] ?? 100;
          return (
            <text
              key={key}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className={`${labelText} font-medium`}
              fill={getColor(score)}
            >
              {key.replace('CPP-0', '')}
            </text>
          );
        })}
      </svg>

      <div className="mt-3 text-center">
        <span className={`${scoreText} font-bold`} style={{ color: getColor(avgScore) }}>
          {displayScore}
        </span>
        <span className="text-sm text-gray-500 dark:text-slate-400 ml-1">
          {QUESTIONNAIRE.SCORE_OUT_OF}
        </span>
      </div>

      {showLegend && (
        <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
          {DOMAIN_ENTRIES.map((domain) => {
            const score = scores[domain.code] ?? 0;
            return (
              <div key={domain.code} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getColor(score) }}
                />
                <span className="text-gray-600 dark:text-slate-300 truncate">{domain.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
