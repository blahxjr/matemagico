export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <section className="mx-auto flex max-w-4xl flex-col gap-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Foundation</p>
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">MateMágico Champions</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            A fundação técnica está pronta para receber as jornadas de aprendizagem em módulos
            independentes, com contratos públicos e segurança server-first.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {['Next.js App Router', 'TypeScript strict', 'Workspace npm'].map((item) => (
            <div key={item} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm font-medium text-slate-200">{item}</p>
              <p className="mt-2 text-sm text-emerald-300">Configured</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
