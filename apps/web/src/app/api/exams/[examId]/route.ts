import { updateExamHandler } from '../../../../lib/bff-admin';

export async function PATCH(request: Request, context: { params: Promise<{ examId: string }> }) {
  return updateExamHandler(request, (await context.params).examId);
}
