import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import {
  InMemoryQuestionRepository,
  InMemoryImportExecutionRepository,
} from '../infrastructure/in-memory-question.repository';
import { ImportQuestionsFromXlsx, XLSX_WORKSHEET_NAME } from './import-xlsx.service';
import { Topic } from '@matemagico/topics';
import type { TopicRepository } from '@matemagico/topics';

class InMemoryTopics implements TopicRepository {
  private readonly topics = new Map<string, Topic>();
  async add(topic: Topic) {
    if (this.topics.has(topic.slug)) return 'CONFLICT' as const;
    this.topics.set(topic.slug, topic);
    return 'CREATED' as const;
  }
  async findById(topicId: string) {
    return [...this.topics.values()].find((topic) => topic.id === topicId) ?? null;
  }
  async findBySlug(slug: string) {
    return this.topics.get(slug) ?? null;
  }
  async list() {
    return [...this.topics.values()];
  }
  async save(topic: Topic) {
    this.topics.set(topic.slug, topic);
  }
}

const now = new Date('2026-10-10T00:00:00.000Z');

function workbook(rows: Record<string, unknown>[]): Buffer {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, XLSX_WORKSHEET_NAME);
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('ImportQuestionsFromXlsx', () => {
  it('processes 640 rows, preserves editorial metadata and never publishes automatically', async () => {
    const questions = new InMemoryQuestionRepository();
    const service = new ImportQuestionsFromXlsx({
      questions,
      topics: new InMemoryTopics(),
      executions: new InMemoryImportExecutionRepository(),
      clock: { now: () => now },
      ids: {
        next: (() => {
          let n = 0;
          return () => `q-${++n}`;
        })(),
      },
    });
    const rows = Array.from({ length: 640 }, (_, index) => ({
      Título: `Questão ${index + 1}`,
      Enunciado: `Quanto é ${index + 1} + 1?`,
      Nível: 'OBMEP_N1',
      Categoria: 'Números e Álgebra',
      Subcategoria: 'Adição',
      Tags: 'adição; números',
      Autor: 'OBMEP',
      TipoAutor: 'ORGANIZATION',
      AutorVerificado: 'sim',
      TipoOrigem: 'OLYMPIAD',
      Origem: 'OBMEP',
      AnoOrigem: 2020,
      Referência: `Fase 1 Questão ${index + 1}`,
      LegacyId: `legacy-${index + 1}`,
      Série: '5º Ano',
      Dificuldade: 'EASY',
      Explicação: 'Some uma unidade ao número.',
      Imagem: index === 0 ? 'https://cdn.example.test/q1.png' : '',
      HashImagem: index === 0 ? 'image-hash' : '',
      AlternativaA: String(index + 1),
      AlternativaB: String(index + 2),
      Gabarito: 'B',
    }));
    const report = await service.execute({ buffer: workbook(rows), fileName: 'banco.xlsx' });
    expect(report).toMatchObject({ processed: 640, created: 640, duplicates: 0, errors: 0 });
    const imported = await questions.list({ status: 'IMPORTED' }, { limit: 700, offset: 0 });
    expect(imported.total).toBe(640);
    expect((await questions.list({ status: 'PUBLISHED' }, { limit: 700, offset: 0 })).total).toBe(
      0,
    );
    expect(imported.items[0]).toMatchObject({
      status: 'IMPORTED',
      content: {
        authorName: 'OBMEP',
        authorType: 'ORGANIZATION',
        authorVerified: true,
        sourceType: 'OLYMPIAD',
        sourceName: 'OBMEP',
        sourceYear: 2020,
        gradeLevel: '5º Ano',
        difficulty: 'EASY',
        explanation: 'Some uma unidade ao número.',
        imageStatus: 'PENDING',
        imageHash: 'image-hash',
        tags: ['adição', 'números'],
      },
    });
  });

  it('detects duplicate rows in the workbook and previously imported content', async () => {
    const questions = new InMemoryQuestionRepository();
    const executions = new InMemoryImportExecutionRepository();
    const service = new ImportQuestionsFromXlsx({
      questions,
      topics: new InMemoryTopics(),
      executions,
      clock: { now: () => now },
      ids: {
        next: (() => {
          let n = 0;
          return () => `q-${++n}`;
        })(),
      },
    });
    const row = {
      Enunciado: '  Quanto\n é 2 + 2? ',
      Nível: 'OBMEP_N1',
      Categoria: 'Geometria',
      Tags: 'teste',
      Autor: 'FGV',
      TipoOrigem: 'EXAM',
      Origem: 'FGV',
      AnoOrigem: 2024,
      Explicação: '4.',
      AlternativaA: '3',
      AlternativaB: '4',
      Gabarito: 'B',
    };
    expect(
      await service.execute({ buffer: workbook([row, { ...row, Enunciado: 'Quanto é 2  + 2?' }]) }),
    ).toMatchObject({ created: 1, duplicates: 1, errors: 0 });
    expect(await service.execute({ buffer: workbook([row]) })).toMatchObject({
      created: 0,
      duplicates: 1,
      errors: 0,
    });
    expect(await executions.totalDuplicates()).toBe(2);
  });
});
