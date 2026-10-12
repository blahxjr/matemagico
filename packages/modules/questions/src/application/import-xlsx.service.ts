import { randomUUID } from 'node:crypto';
import * as XLSX from 'xlsx';
import { Topic, normalizeTopicSlug, type TopicRepository } from '@matemagico/topics';
import { Question, parseContent, type RawQuestionContent } from '../domain/question';
import type {
  Clock,
  ImportExecutionRepository,
  QuestionIdGenerator,
  QuestionRepository,
} from '../domain/ports';
import { QuestionsError } from '../domain/questions-error';

export const XLSX_WORKSHEET_NAME = 'BANCO_QUESTOES_V11';
export type ImportRowResult = 'CREATED' | 'DUPLICATE' | 'ERROR';

export interface XlsxImportReport {
  readonly importExecutionId: string;
  readonly worksheetName: string;
  readonly processed: number;
  readonly created: number;
  readonly duplicates: number;
  readonly errors: number;
  readonly rows: readonly { index: number; result: ImportRowResult; code?: string }[];
}

type SheetRow = Record<string, unknown>;

const REQUIRED_PARENT_TOPICS = [
  'Números e Álgebra',
  'Grandezas e Medidas',
  'Geometria',
  'Tratamento da Informação',
] as const;

const aliases: Record<string, readonly string[]> = {
  title: ['titulo', 'título', 'title'],
  statement: ['enunciado', 'questao', 'questão', 'statement'],
  level: ['level', 'nivel', 'nível'],
  gradeLevel: ['serie', 'série', 'anoescolar', 'gradelevel'],
  parentTopic: ['categoria', 'topico', 'tópico', 'parenttopic'],
  childTopic: ['subcategoria', 'subtopico', 'subtópico', 'childtopic'],
  tags: ['tags', 'tag', 'palavraschave', 'palavras-chave'],
  authorName: ['autor', 'author', 'authorname'],
  authorType: ['tipoautor', 'autortipo', 'authortype'],
  authorVerified: ['autorverificado', 'authorverified'],
  sourceType: ['tipoorigem', 'sourcetype'],
  sourceName: ['origem', 'fonte', 'sourcename'],
  sourceYear: ['anoorigem', 'sourceyear'],
  sourceReference: ['referencia', 'referência', 'sourcereference'],
  legacyId: ['legacyid', 'idlegado', 'id_legado'],
  id: ['id', 'legacyid', 'idlegado'],
  difficulty: ['dificuldade', 'difficulty'],
  explanation: ['explicacao', 'explicação', 'explanation'],
  imageUrl: ['imageurl', 'imagem', 'urlimagem', 'url_imagem'],
  imageHash: ['imagehash', 'hashimagem', 'hash_imagem'],
  correctOption: ['gabarito', 'resposta', 'correctoption', 'correta'],
  metadata: ['metadados', 'metadata'],
};
const metadataAliases: Record<string, readonly string[]> = {
  parentTopic: ['categoria', 'parenttopic'],
  childTopic: ['subcategoria', 'childtopic'],
  sourceNotes: ['fonte', 'attribution', 'sourcenotes'],
  imageUrl: ['imagem', 'imageurl', 'urlimagem'],
  difficulty: ['dificuldade', 'difficulty'],
  authorName: ['autor', 'author'],
  sourceName: ['sourcename'],
};

const asText = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number' && !Number.isFinite(value)) return undefined;
  const text = String(value).trim();
  return !text || /^nan$/i.test(text) ? undefined : text;
};
const header = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
const normal = (value: string): string =>
  value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');

function value(row: SheetRow, key: string): unknown {
  const candidates = new Set((aliases[key] ?? []).map(header));
  return Object.entries(row).find(([name]) => candidates.has(header(name)))?.[1];
}

function metadata(row: SheetRow): SheetRow {
  const raw = value(row, 'metadata');
  if (typeof raw !== 'string' || !raw.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw.replace(/(:\s*)NaN(?=\s*[,}])/g, '$1null'));
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as SheetRow)
      : {};
  } catch {
    throw new QuestionsError('QST-001');
  }
}

function field(row: SheetRow, metadataFields: SheetRow, key: string): unknown {
  const direct = value(row, key);
  if (direct !== undefined && direct !== null) return direct;
  const candidates = new Set((metadataAliases[key] ?? aliases[key] ?? [key]).map(header));
  return Object.entries(metadataFields).find(([name]) => candidates.has(header(name)))?.[1];
}

function optionValue(row: SheetRow, label: string): unknown {
  const candidates = new Set(
    [`alternativa${label}`, `opcao${label}`, `opção${label}`, `option${label}`].map(header),
  );
  return Object.entries(row).find(([name]) => candidates.has(header(name)))?.[1];
}

function mapped(value: unknown, map: Record<string, string>, fallback: string): string {
  const text = asText(value);
  return text ? (map[normal(text)] ?? fallback) : fallback;
}

function levelFrom(value: unknown): string | null {
  const raw = normal(asText(value) ?? '');
  if (['obmepmirim', 'mirim'].includes(raw)) return 'OBMEP_MIRIM';
  if (['obmepn1', 'n1', 'nivel 1', 'nível 1'].includes(raw)) return 'OBMEP_N1';
  if (['obmepn2', 'n2', 'nivel 2', 'nível 2'].includes(raw)) return 'OBMEP_N2';
  if (['obmepn3', 'n3', 'nivel 3', 'nível 3'].includes(raw)) return 'OBMEP_N3';
  return null;
}

function toYear(value: unknown): number | null {
  const number = Number(asText(value));
  return Number.isInteger(number) ? number : null;
}

function parseTags(value: unknown): string[] {
  return (asText(value) ?? '')
    .split(/[;,|]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function toRaw(row: SheetRow, topicId: string): RawQuestionContent {
  const fields = metadata(row);
  const get = (key: string) => field(row, fields, key);
  const gradeLevel = asText(get('gradeLevel'));
  const correct = (asText(get('correctOption')) ?? '').toUpperCase();
  const options = ['A', 'B', 'C', 'D', 'E']
    .map((label) => ({
      label,
      content: asText(optionValue(row, label) ?? fields[`Alternativa${label}`]),
      isCorrect: label === correct,
    }))
    .filter(
      (option): option is { label: string; content: string; isCorrect: boolean } =>
        !!option.content,
    );
  const imageUrl = asText(get('imageUrl'));
  const attribution = asText(get('sourceNotes'));
  return {
    title: asText(get('title')) ?? asText(get('statement')) ?? 'Questão importada',
    statement: asText(get('statement')),
    level: levelFrom(get('level')),
    topicId,
    sourceType: mapped(
      get('sourceType'),
      {
        olimpiada: 'OLYMPIAD',
        olympiad: 'OLYMPIAD',
        prova: 'EXAM',
        exame: 'EXAM',
        exam: 'EXAM',
        livro: 'BOOK',
        book: 'BOOK',
        interno: 'INTERNAL',
        internal: 'INTERNAL',
      },
      'UNKNOWN',
    ),
    sourceName: asText(get('sourceName')) ?? 'Unknown',
    sourceYear: toYear(get('sourceYear')),
    sourceReference: asText(get('sourceReference')),
    sourceNotes: attribution,
    legacyId: asText(get('legacyId')) ?? asText(get('id')),
    authorName: asText(get('authorName')) ?? 'Unknown',
    authorType: mapped(
      get('authorType'),
      {
        autor: 'AUTHOR',
        author: 'AUTHOR',
        organizacao: 'ORGANIZATION',
        organização: 'ORGANIZATION',
        organization: 'ORGANIZATION',
      },
      'UNKNOWN',
    ),
    authorVerified: ['true', 'sim', '1', 'yes'].includes(
      normal(asText(get('authorVerified')) ?? ''),
    ),
    gradeLevel: gradeLevel ?? null,
    difficulty:
      mapped(
        get('difficulty'),
        {
          facil: 'EASY',
          fácil: 'EASY',
          easy: 'EASY',
          medio: 'MEDIUM',
          médio: 'MEDIUM',
          medium: 'MEDIUM',
          dificil: 'HARD',
          difícil: 'HARD',
          hard: 'HARD',
        },
        '',
      ) || null,
    explanation: asText(get('explanation')),
    imageUrl: imageUrl ?? null,
    imageStatus: imageUrl ? 'PENDING' : 'MISSING',
    imageHash: asText(get('imageHash')),
    tags: parseTags(get('tags')),
    options,
  };
}

export function fingerprintForRawQuestion(raw: RawQuestionContent): string {
  const content = parseContent(raw);
  const options = [...content.options]
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((option) => `${option.label}:${normal(option.content)}`)
    .join('\u001e');
  return [
    normal(content.statement),
    options,
    content.options.find((option) => option.isCorrect)?.label ?? '',
  ].join('\u001f');
}

export class ImportQuestionsFromXlsx {
  constructor(
    private readonly deps: {
      questions: QuestionRepository;
      topics: TopicRepository;
      executions: ImportExecutionRepository;
      clock: Clock;
      ids: QuestionIdGenerator;
    },
  ) {}

  async execute(input: {
    buffer: Buffer | ArrayBuffer;
    fileName?: string;
    worksheetName?: string;
  }): Promise<XlsxImportReport> {
    if (!input?.buffer) throw new QuestionsError('QST-001');
    const worksheetName = input.worksheetName ?? XLSX_WORKSHEET_NAME;
    let rows: SheetRow[];
    try {
      const workbook = XLSX.read(input.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[worksheetName];
      if (!worksheet) throw new QuestionsError('QST-007');
      rows = XLSX.utils.sheet_to_json<SheetRow>(worksheet, { defval: null, raw: false });
    } catch (error) {
      if (error instanceof QuestionsError) throw error;
      throw new QuestionsError('QST-007');
    }
    await this.ensureRequiredParents();
    const seen = new Set<string>();
    const results: { index: number; result: ImportRowResult; code?: string }[] = [];
    let created = 0;
    let duplicates = 0;
    let errors = 0;
    for (const [index, row] of rows.entries()) {
      try {
        const fields = metadata(row);
        const topicId = await this.resolveTopic(
          asText(field(row, fields, 'parentTopic')),
          asText(field(row, fields, 'childTopic')),
        );
        const raw = toRaw(row, topicId);
        const fingerprint = fingerprintForRawQuestion(raw);
        if (seen.has(fingerprint) || (await this.deps.questions.existsByFingerprint(fingerprint))) {
          duplicates += 1;
          results.push({ index, result: 'DUPLICATE' });
          continue;
        }
        const question = Question.create({
          questionId: this.deps.ids.next(),
          content: parseContent(raw),
          now: this.deps.clock.now(),
        });
        if ((await this.deps.questions.add(question)) === 'CONFLICT') {
          duplicates += 1;
          results.push({ index, result: 'DUPLICATE' });
          continue;
        }
        seen.add(fingerprint);
        created += 1;
        results.push({ index, result: 'CREATED' });
      } catch (error) {
        errors += 1;
        results.push({
          index,
          result: 'ERROR',
          code: error instanceof QuestionsError ? error.code : 'QST-006',
        });
      }
    }
    const importExecutionId = randomUUID();
    await this.deps.executions.record({
      importExecutionId,
      sourceFileName: input.fileName?.trim() || null,
      worksheetName,
      processed: rows.length,
      created,
      duplicates,
      errors,
      createdAt: this.deps.clock.now(),
    });
    return {
      importExecutionId,
      worksheetName,
      processed: rows.length,
      created,
      duplicates,
      errors,
      rows: results,
    };
  }

  private async ensureRequiredParents(): Promise<void> {
    for (const name of REQUIRED_PARENT_TOPICS) await this.ensureTopic(name);
  }

  private async resolveTopic(parentName?: string, childName?: string): Promise<string> {
    const parent = await this.ensureTopic(parentName || 'Números e Álgebra');
    return childName ? (await this.ensureTopic(childName, parent.id)).id : parent.id;
  }

  private async ensureTopic(name: string, parentTopicId: string | null = null): Promise<Topic> {
    const slug = normalizeTopicSlug(slugFor(name, parentTopicId));
    const existing = await this.deps.topics.findBySlug(slug);
    if (existing) return existing;
    const topic = Topic.create({
      topicId: randomUUID(),
      name: name.trim(),
      slug,
      description: '',
      parentTopicId,
      now: this.deps.clock.now(),
    });
    if ((await this.deps.topics.add(topic)) === 'CREATED') return topic;
    const resolved = await this.deps.topics.findBySlug(slug);
    if (!resolved) throw new QuestionsError('QST-006');
    return resolved;
  }
}

function slugFor(name: string, parentTopicId: string | null = null): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return parentTopicId ? `${base}-${parentTopicId.slice(0, 8)}` : base;
}
