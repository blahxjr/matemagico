export interface ExamOption {
  label: string;
  content: string;
}

export interface ExamQuestion {
  questionId: string;
  questionVersion: number;
  position: number;
  title: string;
  statement: string;
  level?: string | null;
  difficulty?: string | null;
  gradeLevel?: string | null;
  imageUrl?: string | null;
  topicId?: string;
  /** Only present once the attempt is finished. */
  correctOption?: string | null;
  explanation?: string | null;
  options: ExamOption[];
}

export interface ExamSummary {
  examId: string;
  title: string;
  description: string | null;
  level: string;
  status: string;
  durationMinutes: number;
  availableFrom: string | null;
  availableUntil: string | null;
  publishedAt: string | null;
  questions: ExamQuestion[];
}

export interface StatBreakdown {
  correctAnswers: number;
  wrongAnswers: number;
  totalQuestions: number;
  percentage: number;
}

export interface AttemptResult extends StatBreakdown {
  score: number;
  topicResults: Record<string, StatBreakdown>;
  difficultyResults: Record<string, StatBreakdown>;
  gradeLevelResults: Record<string, StatBreakdown>;
}

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';

export interface AttemptAnswer {
  questionId: string;
  questionVersion: number;
  selectedOption: string;
  answeredAt: string;
}

export interface Attempt {
  attemptId: string;
  schoolId: string;
  userId: string;
  examId: string;
  title: string;
  status: AttemptStatus;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  questions: ExamQuestion[];
  answers: AttemptAnswer[];
  result: AttemptResult | null;
}
