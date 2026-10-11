/**
 * Deterministic generator for the MOCK question bank (no third-party content, see ADR-0011).
 * Output: data/questions/mock-questions.json (100 questions + topics) and
 * data/questions/mock-questions.sample.csv (CSV import example).
 * Run: npm run questions:generate
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TOPICS = [
  { slug: 'aritmetica', name: 'Aritmética', description: 'Operações e propriedades dos números.' },
  { slug: 'geometria', name: 'Geometria', description: 'Figuras, perímetros e áreas.' },
  { slug: 'algebra', name: 'Álgebra', description: 'Equações e expressões simples.' },
  { slug: 'logica', name: 'Lógica', description: 'Padrões e sequências.' },
  {
    slug: 'combinatoria',
    name: 'Combinatória',
    description: 'Contagem e princípio multiplicativo.',
  },
] as const;

const LEVELS = ['OBMEP_MIRIM', 'OBMEP_N1', 'OBMEP_N2', 'OBMEP_N3'] as const;
const LABELS = ['A', 'B', 'C', 'D'] as const;
const TOTAL = 100;

interface Generated {
  statement: string;
  answer: number;
}

function build(topic: string, levelIndex: number, n: number): Generated {
  const scale = 2 + levelIndex * 3;
  const a = scale + (n % 7);
  const b = scale + 3 + (n % 5);
  switch (topic) {
    case 'aritmetica':
      return { statement: `Quanto é ${a * 3} + ${b * 4}?`, answer: a * 3 + b * 4 };
    case 'geometria':
      return { statement: `Qual é o perímetro de um quadrado de lado ${a} cm?`, answer: 4 * a };
    case 'algebra':
      return { statement: `Se x + ${a} = ${a + b}, quanto vale x?`, answer: b };
    case 'logica':
      return {
        statement: `Na sequência ${a}, ${a + b}, ${a + 2 * b}, ${a + 3 * b}, qual é o próximo número?`,
        answer: a + 4 * b,
      };
    default:
      return {
        statement: `Com ${a} camisas e ${b} calças diferentes, de quantas maneiras é possível se vestir?`,
        answer: a * b,
      };
  }
}

function distinctOptions(answer: number, position: number) {
  const distractors = [answer + 1, Math.max(answer - 1, 0), answer + 10, answer + 2].filter(
    (value) => value !== answer,
  );
  const unique = [...new Set(distractors)].slice(0, 3);
  while (unique.length < 3) unique.push(answer + 20 + unique.length);
  const values = [...unique];
  values.splice(position, 0, answer);
  return values.map((value, index) => ({
    label: LABELS[index]!,
    content: String(value),
    isCorrect: index === position,
  }));
}

const questions = Array.from({ length: TOTAL }, (_, i) => {
  const topic = TOPICS[i % TOPICS.length]!;
  const levelIndex = Math.floor(i / TOPICS.length) % LEVELS.length;
  const { statement, answer } = build(topic.slug, levelIndex, i);
  return {
    title: `${topic.name} ${String(i + 1).padStart(3, '0')}`,
    statement,
    level: LEVELS[levelIndex]!,
    topicSlug: topic.slug,
    sourceName: 'MOCK',
    sourceYear: 2020 + (i % 5),
    sourceReference: `MOCK-${String(i + 1).padStart(3, '0')}`,
    options: distinctOptions(answer, i % LABELS.length),
  };
});

const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
const csvHeader =
  'title,statement,level,topicSlug,sourceName,sourceYear,sourceReference,optionA,optionB,optionC,optionD,correct';
const csvRows = questions
  .slice(0, 5)
  .map((q, index) =>
    [
      q.title,
      q.statement,
      q.level,
      q.topicSlug,
      q.sourceName,
      q.sourceYear,
      `MOCK-CSV-${String(index + 1).padStart(3, '0')}`,
      ...q.options.map((option) => option.content),
      q.options.find((option) => option.isCorrect)!.label,
    ]
      .map(quote)
      .join(','),
  );

const dir = join(process.cwd(), 'data', 'questions');
mkdirSync(dir, { recursive: true });
writeFileSync(
  join(dir, 'mock-questions.json'),
  `${JSON.stringify({ topics: TOPICS, questions }, null, 2)}\n`,
);
writeFileSync(join(dir, 'mock-questions.sample.csv'), `${[csvHeader, ...csvRows].join('\n')}\n`);
console.log(`Generated ${questions.length} mock questions in ${dir}.`);
