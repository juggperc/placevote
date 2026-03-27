import { detectFileType } from './_upload-preview.js';

type UploadClassification =
  | 'CommunityConsultation'
  | 'BudgetData'
  | 'ProjectTimeline'
  | 'ServiceRequest'
  | 'DevelopmentApplication'
  | 'DemographicData'
  | 'GeospatialData'
  | 'Unknown';

type OntologyNodeType = 'Place' | 'Project' | 'Submission' | 'Budget' | 'Signal';

export type FallbackClassification = {
  detected_type: UploadClassification;
  useful_for: string[];
  risk_flags: string[];
  row_summary: string;
};

export type FallbackOntology = {
  nodes: Array<{
    type: OntologyNodeType;
    label: string;
    properties: Record<string, unknown>;
  }>;
  edges: Array<{
    source_label: string;
    target_label: string;
    label: string;
    weight: number;
  }>;
};

const DATASET_USE_CASES: Record<UploadClassification, string[]> = {
  CommunityConsultation: [
    'Track recurring resident concerns',
    'Support briefing notes and consultation summaries',
  ],
  BudgetData: [
    'Inspect line items and allocations',
    'Prepare finance or program briefing notes',
  ],
  ProjectTimeline: [
    'Track milestone slippage and delivery sequencing',
    'Summarise project status for leadership updates',
  ],
  ServiceRequest: [
    'Identify operational hotspots and complaint clusters',
    'Triage recurring service issues',
  ],
  DevelopmentApplication: [
    'Review planning and development pressure points',
    'Surface proposal-related objections or support',
  ],
  DemographicData: [
    'Compare population or service demand patterns',
    'Support place-based planning decisions',
  ],
  GeospatialData: [
    'Map civic pressure and location-based evidence',
    'Overlay uploaded data with friction hotspots',
  ],
  Unknown: [
    'Review manually before downstream analysis',
  ],
};

const BUDGET_KEYWORDS = ['budget', 'funding', 'allocation', 'capex', 'opex', 'expenditure', 'revenue'];
const TIMELINE_KEYWORDS = ['timeline', 'milestone', 'stage', 'delivery', 'deadline', 'program'];
const SERVICE_KEYWORDS = ['service request', 'complaint', 'maintenance', 'issue', 'fault', 'incident'];
const DEVELOPMENT_KEYWORDS = ['development application', 'da ', 'planning permit', 'rezoning', 'precinct plan'];
const DEMOGRAPHIC_KEYWORDS = ['population', 'census', 'household', 'demographic', 'age group'];
const PLACE_KEYS = ['name', 'suburb', 'locality', 'precinct', 'region', 'location', 'place', 'sa2'];
const COMMON_PHRASES = new Set([
  'FeatureCollection',
  'Polygon',
  'MultiPolygon',
  'LineString',
  'Point',
  'Properties',
  'Geometry',
  'Victoria',
  'Australia',
]);

function slugToLabel(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, '');
  return stem
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase()) || 'Uploaded dataset';
}

function includesAny(sample: string, keywords: string[]): boolean {
  const haystack = sample.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

function sanitizeLabel(value: string): string | null {
  const clean = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (!clean || clean.length < 3 || clean.length > 72) return null;
  if (/^[\d\s.,-]+$/.test(clean)) return null;
  if (COMMON_PHRASES.has(clean)) return null;

  return clean;
}

function collectFromStructuredSample(sample: string): string[] {
  const labels = new Set<string>();

  function visit(value: unknown, keyHint = ''): void {
    if (labels.size >= 6) return;

    if (Array.isArray(value)) {
      value.slice(0, 10).forEach((entry) => visit(entry, keyHint));
      return;
    }

    if (value && typeof value === 'object') {
      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        visit(nested, key);
      }
      return;
    }

    if (typeof value !== 'string') return;

    const normalizedKey = keyHint.toLowerCase();
    const clean = sanitizeLabel(value);
    if (!clean) return;

    if (PLACE_KEYS.some((key) => normalizedKey.includes(key))) {
      labels.add(clean);
    }
  }

  try {
    visit(JSON.parse(sample));
  } catch {
    return [];
  }

  return Array.from(labels);
}

function collectFromTextSample(sample: string): string[] {
  const labels = new Set<string>();
  const matches = sample.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\b/g) ?? [];

  for (const match of matches) {
    const clean = sanitizeLabel(match);
    if (!clean || COMMON_PHRASES.has(clean)) continue;
    labels.add(clean);
    if (labels.size >= 6) break;
  }

  return Array.from(labels);
}

function collectCandidateLabels(sample: string): string[] {
  const structured = collectFromStructuredSample(sample);
  if (structured.length > 0) return structured;
  return collectFromTextSample(sample);
}

function inferClassification(filename: string, sample: string): UploadClassification {
  const detectedType = detectFileType(filename);
  const loweredSample = sample.toLowerCase();
  const loweredFilename = filename.toLowerCase();
  const haystack = `${loweredFilename}\n${loweredSample}`;

  if (
    detectedType === 'geojson' ||
    detectedType === 'shapefile' ||
    haystack.includes('featurecollection') ||
    haystack.includes('"geometry"')
  ) {
    return 'GeospatialData';
  }

  if (includesAny(haystack, DEVELOPMENT_KEYWORDS)) {
    return 'DevelopmentApplication';
  }

  if (includesAny(haystack, BUDGET_KEYWORDS)) {
    return 'BudgetData';
  }

  if (includesAny(haystack, TIMELINE_KEYWORDS)) {
    return 'ProjectTimeline';
  }

  if (includesAny(haystack, SERVICE_KEYWORDS)) {
    return 'ServiceRequest';
  }

  if (includesAny(haystack, DEMOGRAPHIC_KEYWORDS)) {
    return 'DemographicData';
  }

  if (detectedType === 'pdf' || detectedType === 'csv' || detectedType === 'xlsx' || detectedType === 'json') {
    return 'CommunityConsultation';
  }

  return 'Unknown';
}

function inferRiskFlags(sample: string): string[] {
  const flags: string[] = [];

  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(sample)) {
    flags.push('Potential email addresses detected');
  }

  if (/\b(?:\+?61|0)[2-478](?:[\s-]?\d){8}\b/.test(sample)) {
    flags.push('Potential phone numbers detected');
  }

  if (sample.includes('… [truncated]')) {
    flags.push('Preview sample is truncated');
  }

  if (flags.length === 0) {
    flags.push('Fallback extraction used because AI classification was unavailable');
  }

  return flags;
}

function mapClassificationToNodeType(classification: UploadClassification): OntologyNodeType {
  switch (classification) {
    case 'BudgetData':
      return 'Budget';
    case 'ProjectTimeline':
    case 'DevelopmentApplication':
      return 'Project';
    case 'CommunityConsultation':
      return 'Submission';
    case 'GeospatialData':
    case 'DemographicData':
      return 'Place';
    case 'ServiceRequest':
    case 'Unknown':
    default:
      return 'Signal';
  }
}

export function buildFallbackClassification({
  filename,
  rowCount,
  sample,
}: {
  filename: string;
  rowCount: number;
  sample: string;
}): FallbackClassification {
  const detected_type = inferClassification(filename, sample);
  const summarySource = slugToLabel(filename);
  const rowSummary =
    rowCount > 0
      ? `${summarySource} contains approximately ${rowCount.toLocaleString()} records.`
      : `${summarySource} was queued with a limited preview sample.`;

  return {
    detected_type,
    useful_for: DATASET_USE_CASES[detected_type],
    risk_flags: inferRiskFlags(sample),
    row_summary: rowSummary,
  };
}

export function buildFallbackOntology({
  filename,
  sample,
}: {
  filename: string;
  sample: string;
}): FallbackOntology {
  const classification = inferClassification(filename, sample);
  const anchorType = mapClassificationToNodeType(classification);
  const anchorLabel = slugToLabel(filename);
  const relatedLabels = collectCandidateLabels(sample)
    .filter((label) => label.toLowerCase() !== anchorLabel.toLowerCase())
    .slice(0, 5);

  const nodes: FallbackOntology['nodes'] = [
    {
      type: anchorType,
      label: anchorLabel,
      properties: {
        source: 'fallback',
        classification,
      },
    },
  ];

  const edges: FallbackOntology['edges'] = [];
  const relatedType: OntologyNodeType =
    classification === 'GeospatialData' || classification === 'DemographicData'
      ? 'Place'
      : anchorType;
  const edgeLabel = relatedType === 'Place' ? 'MENTIONS_PLACE' : 'RELATES_TO';

  for (const label of relatedLabels) {
    nodes.push({
      type: relatedType,
      label,
      properties: {
        source: 'fallback',
      },
    });
    edges.push({
      source_label: anchorLabel,
      target_label: label,
      label: edgeLabel,
      weight: 1,
    });
  }

  return { nodes, edges };
}
