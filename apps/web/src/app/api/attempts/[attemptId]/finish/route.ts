import { finishAttemptHandler } from '../../../../../lib/bff-attempts';

export async function POST(request: Request, context: { params: Promise<{ attemptId: string }> }) {
  return finishAttemptHandler(request, (await context.params).attemptId);
}
