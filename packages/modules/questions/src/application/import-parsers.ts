import { QuestionsError } from '../domain/questions-error';
import { OPTION_LABELS } from '../domain/question';

/** One row of the import format, before validation (see docs/questions/IMPORT-FORMAT.md). */
export interface ImportRow {
  title?: unknown;
  statement?: unknown;
  level?: unknown;
  topicSlug?: unknown;
  sourceName?: unknown;
  sourceYear?: unknown;
  sourceReference?: unknown;
  options?: unknown;
}

export function parseJsonRows(payload: string): ImportRow[] {
  let data: unknown;
  try {
    data = JSON.parse(payload);
  } catch {
    throw new QuestionsError('QST-007');
  }
  const rows = Array.isArray(data)
    ? data
    : typeof data === 'object' &&
        data !== null &&
        Array.isArray((data as { questions?: unknown }).questions)
      ? (data as { questions: unknown[] }).questions
      : null;
  if (!rows) throw new QuestionsError('QST-007');
  return rows.map((row) => (typeof row === 'object' && row !== null ? (row as ImportRow) : {}));
}

/** Minimal RFC 4180 reader: quoted fields, escaped quotes (""), CRLF/LF, embedded newlines. */
export function parseCsvTable(payload: string): string[][] {
  const table: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const text = payload.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"' && field === '') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((cell) => cell !== '')) table.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (quoted) throw new QuestionsError('QST-007');
  row.push(field);
  if (row.some((cell) => cell !== '')) table.push(row);
  return table;
}

const REQUIRED_COLUMNS = [
  'title',
  'statement',
  'level',
  'topicSlug',
  'sourceName',
  'sourceYear',
  'sourceReference',
  'correct',
  'optionA',
  'optionB',
];

export function parseCsvRows(payload: string): ImportRow[] {
  const [header, ...body] = parseCsvTable(payload);
  if (!header) throw new QuestionsError('QST-007');
  const columns = header.map((name) => name.trim());
  if (REQUIRED_COLUMNS.some((name) => !columns.includes(name))) {
    throw new QuestionsError('QST-007');
  }
  return body.map((cells) => {
    const get = (name: string) => cells[columns.indexOf(name)]?.trim() ?? '';
    const correct = get('correct').toUpperCase();
    const options = OPTION_LABELS.map((label) => ({ label, content: get(`option${label}`) }))
      .filter((option) => option.content !== '')
      .map((option) => ({ ...option, isCorrect: option.label === correct }));
    const year = get('sourceYear');
    return {
      title: get('title'),
      statement: get('statement'),
      level: get('level'),
      topicSlug: get('topicSlug'),
      sourceName: get('sourceName'),
      sourceYear: year === '' ? null : /^\d+$/.test(year) ? Number(year) : year,
      sourceReference: get('sourceReference') || null,
      options,
    };
  });
}
