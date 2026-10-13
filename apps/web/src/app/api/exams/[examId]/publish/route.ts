import { publishExamHandler } from '../../../../../lib/bff-admin';

export async function POST(request: Request, context: { params: Promise<{ examId: string }> }) {
  return publishExamHandler(request, (await context.params).examId);
}
