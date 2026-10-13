const MESSAGES: Record<string, string> = {
  'AUTH-001': 'Credenciais inválidas.',
  'AUTH-002': 'Não foi possível autenticar. Tente novamente.',
  'AUTH-003': 'Sua sessão expirou. Entre novamente.',
  'AUTH-004': 'Muitas tentativas. Aguarde alguns instantes.',
  'AUTH-005': 'Acesso não permitido para esta conta.',
  'MEM-001': 'Vínculo com a escola inválido.',
  'MEM-002': 'Vínculo com a escola não encontrado.',
  'SC-001': 'Escola não encontrada.',
  'SC-002': 'Você não tem acesso a esta escola.',
  'QST-001': 'Questão inválida.',
  'QST-002': 'Questão não encontrada.',
  'ATT-001': 'Tentativa inválida.',
  'ATT-002': 'Tentativa não encontrada ou sem permissão de acesso.',
  'ATT-003': 'Esta tentativa já foi finalizada.',
  'ATT-004': 'O tempo da tentativa expirou.',
  'ATT-005': 'Já existe uma tentativa em andamento para este simulado.',
  'ATT-006': 'Não foi possível processar a tentativa.',
  'EXM-002': 'Simulado não encontrado ou indisponível.',
  UNAVAILABLE: 'Serviço indisponível. Tente novamente em instantes.',
  INVALID_REQUEST: 'Dados inválidos. Revise o formulário.',
};

const PREFIX_FALLBACK: Record<string, string> = {
  AUTH: 'Falha de autenticação.',
  MEM: 'Falha no vínculo com a escola.',
  SC: 'Falha no contexto da escola.',
  QST: 'Falha ao processar a questão.',
  ATT: 'Falha ao processar a tentativa.',
};

export const GENERIC_ERROR = 'Não foi possível concluir a operação.';

/** Maps backend error codes (AUTH, MEM, SC, QST, ATT) to user-facing messages. */
export function messageForError(code: string | null | undefined): string {
  if (!code) return GENERIC_ERROR;
  if (MESSAGES[code]) return MESSAGES[code];
  const prefix = /^([A-Z]+)-\d+/.exec(code)?.[1];
  return (prefix && PREFIX_FALLBACK[prefix]) || GENERIC_ERROR;
}
