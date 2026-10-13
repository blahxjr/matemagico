export function QuestionProgress({ answered, total }: { answered: number; total: number }) {
  const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-slate-300" data-testid="progress-label">
        {answered} de {total} respondidas
      </p>
      <div
        role="progressbar"
        aria-label="Questões respondidas"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-700"
      >
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
