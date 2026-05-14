/**
 * Report diff engine — pure function comparing two findingsJson objects.
 * No side effects, no DB access. Used by reports-service for version comparison.
 */

interface Finding {
  id?: string;
  title?: string;
  domain?: string;
  severity?: string;
  description?: string;
  [key: string]: unknown;
}

interface DomainScore {
  domain: string;
  score: number;
}

interface ReportFindings {
  findings?: Finding[];
  domain_scores?: DomainScore[];
  urgency_score?: number;
  [key: string]: unknown;
}

export interface DiffResult {
  addedFindings: Finding[];
  removedFindings: Finding[];
  scoreChanges: { domain: string; oldScore: number; newScore: number }[];
  urgencyDelta: number;
  hasChanges: boolean;
}

function findingKey(f: Finding): string {
  return `${f.domain ?? ''}::${f.title ?? f.description ?? f.id ?? ''}`;
}

export function compareReports(
  previous: ReportFindings | null,
  current: ReportFindings | null,
): DiffResult {
  // Both null means no data to compare — not a meaningful change.
  if (!previous && !current) {
    return { addedFindings: [], removedFindings: [], scoreChanges: [], urgencyDelta: 0, hasChanges: false };
  }
  // One side missing — treat all current findings as added (or all previous as removed).
  if (!previous || !current) {
    return {
      addedFindings: current?.findings ?? [],
      removedFindings: previous?.findings ?? [],
      scoreChanges: [],
      urgencyDelta: 0,
      hasChanges: true,
    };
  }

  const prevFindings = previous.findings ?? [];
  const currFindings = current.findings ?? [];
  const prevKeys = new Set(prevFindings.map(findingKey));
  const currKeys = new Set(currFindings.map(findingKey));

  const addedFindings = currFindings.filter((f) => !prevKeys.has(findingKey(f)));
  const removedFindings = prevFindings.filter((f) => !currKeys.has(findingKey(f)));

  const prevScoreMap = new Map(
    (previous.domain_scores ?? []).map((d) => [d.domain, d.score]),
  );
  const currScoreMap = new Map(
    (current.domain_scores ?? []).map((d) => [d.domain, d.score]),
  );
  const allDomains = new Set([...prevScoreMap.keys(), ...currScoreMap.keys()]);

  const scoreChanges: DiffResult['scoreChanges'] = [];
  for (const domain of allDomains) {
    const oldScore = prevScoreMap.get(domain) ?? 0;
    const newScore = currScoreMap.get(domain) ?? 0;
    if (oldScore !== newScore) {
      scoreChanges.push({ domain, oldScore, newScore });
    }
  }

  const urgencyDelta =
    (current.urgency_score ?? 0) - (previous.urgency_score ?? 0);

  const hasChanges =
    addedFindings.length > 0 ||
    removedFindings.length > 0 ||
    scoreChanges.length > 0 ||
    urgencyDelta !== 0;

  return { addedFindings, removedFindings, scoreChanges, urgencyDelta, hasChanges };
}
