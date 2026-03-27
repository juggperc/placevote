const MAX_SAMPLE_CHARS = 8_000;

export type UploadPreview = {
  rowCount: number;
  sample: string;
};

export function detectFileType(filename: string): string | null {
  const ext = getExtension(filename);
  const map: Record<string, string> = {
    csv: 'csv',
    xlsx: 'xlsx',
    pdf: 'pdf',
    json: 'json',
    geojson: 'geojson',
    zip: 'shapefile',
  };
  return ext ? map[ext] ?? null : null;
}

export function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

function truncate(text: string): string {
  return text.length > MAX_SAMPLE_CHARS
    ? `${text.slice(0, MAX_SAMPLE_CHARS)}\n… [truncated]`
    : text;
}

async function parseCSV(buffer: Buffer): Promise<UploadPreview> {
  const Papa = (await import('papaparse')).default;
  const text = buffer.toString('utf-8');
  const result = Papa.parse(text, { header: true, preview: 50 });
  const rows = result.data as Record<string, unknown>[];
  const totalRows = Math.max(
    text.split('\n').filter((line) => line.trim()).length - 1,
    0,
  );

  return {
    rowCount: totalRows,
    sample: truncate(JSON.stringify(rows.slice(0, 20), null, 2)),
  };
}

async function parseXLSX(buffer: Buffer): Promise<UploadPreview> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

  return {
    rowCount: rows.length,
    sample: truncate(JSON.stringify(rows.slice(0, 20), null, 2)),
  };
}

async function parsePDF(buffer: Buffer): Promise<UploadPreview> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const textResult = await parser.getText();
  await parser.destroy();
  const fullText = textResult.text;
  const lines = fullText.split('\n').filter((line) => line.trim());

  return {
    rowCount: lines.length,
    sample: truncate(fullText),
  };
}

function parseJSON(buffer: Buffer): UploadPreview {
  const text = buffer.toString('utf-8');
  const data = JSON.parse(text) as unknown;

  if (
    data &&
    typeof data === 'object' &&
    'type' in data &&
    (data as Record<string, unknown>).type === 'FeatureCollection' &&
    'features' in data &&
    Array.isArray((data as Record<string, unknown>).features)
  ) {
    const features = (data as { features: unknown[] }).features;
    return {
      rowCount: features.length,
      sample: truncate(JSON.stringify(features.slice(0, 10), null, 2)),
    };
  }

  if (Array.isArray(data)) {
    return {
      rowCount: data.length,
      sample: truncate(JSON.stringify(data.slice(0, 20), null, 2)),
    };
  }

  return {
    rowCount: 1,
    sample: truncate(JSON.stringify(data, null, 2)),
  };
}

export async function parseUploadBuffer(
  buffer: Buffer,
  filename: string,
): Promise<UploadPreview> {
  const ext = getExtension(filename);

  switch (ext) {
    case 'csv':
      return parseCSV(buffer);
    case 'xlsx':
      return parseXLSX(buffer);
    case 'pdf':
      return parsePDF(buffer);
    case 'json':
    case 'geojson':
      return parseJSON(buffer);
    case 'zip':
      return {
        rowCount: 0,
        sample: '[Shapefile ZIP archive. Requires GDAL for full extraction.]',
      };
    default:
      return {
        rowCount: 0,
        sample: `[Unknown file type: .${ext || 'unknown'}]`,
      };
  }
}
