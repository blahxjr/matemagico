import { submitAnswerHandler } from '../../../../../lib/bff-attempts';

export async function POST(request: Request, context: { params: Promise<{ attemptId: string }> }) {
  return submitAnswerHandler(request, (await context.params).attemptId);
}
