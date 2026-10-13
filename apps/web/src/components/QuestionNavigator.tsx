import { cn } from '@matemagico/ui';

export interface QuestionNavigatorProps {
  total: number;
  current: number;
  answered: readonly boolean[];
  onGo: (index: number) => void;
}

export function QuestionNavigator({ total, current, answered, onGo }: QuestionNavigatorProps) {
  return (
    <nav aria-label="Navegação entre questões" className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onGo(current - 1)}
          disabled={current <= 0}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onGo(current + 1)}
          disabled={current >= total - 1}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:opacity-40"
        >
          Próxima
        </button>
      </div>
      <ol aria-label="Ir para questão" className="flex flex-wrap gap-2">
        {Array.from({ length: total }, (_, index) => {
          const isAnswered = answered[index] ?? false;
          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => onGo(index)}
                aria-current={index === current ? 'step' : undefined}
                aria-label={`Ir para questão ${index + 1} — ${isAnswered ? 'respondida' : 'não respondida'}`}
                className={cn(
                  'h-10 w-10 rounded-lg border text-sm font-semibold focus-visible:outline-2 focus-visible:outline-cyan-400',
                  isAnswered
                    ? 'border-emerald-500 bg-emerald-900 text-emerald-100'
                    : 'border-slate-600 bg-slate-900 text-slate-300',
                  index === current && 'ring-2 ring-cyan-400',
                )}
              >
                {index + 1}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="flex gap-4 text-xs text-slate-400">
        <span>
          <span
            aria-hidden="true"
            className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500"
          />
          Respondida
        </span>
        <span>
          <span
            aria-hidden="true"
            className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-500"
          />
          Não respondida
        </span>
      </p>
    </nav>
  );
}
