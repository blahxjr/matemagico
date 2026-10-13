const HTTP_DURATION_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000] as const;

type Labels = Readonly<Record<string, string | number>>;

export class MetricsRegistry {
  private readonly counters = new Map<string, number>();
  private readonly durations = new Map<string, { count: number; sum: number; buckets: number[] }>();

  increment(name: string, labels: Labels = {}): void {
    const key = this.key(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
  }

  observeHttp(route: string, method: string, statusCode: number, durationMs: number): void {
    this.increment('requests_total', { method, route, status: statusCode });
    const key = this.key('request_duration_ms', { method, route });
    const observation = this.durations.get(key) ?? {
      count: 0,
      sum: 0,
      buckets: HTTP_DURATION_BUCKETS.map(() => 0),
    };
    observation.count += 1;
    observation.sum += durationMs;
    HTTP_DURATION_BUCKETS.forEach((bucket, index) => {
      if (durationMs <= bucket) observation.buckets[index] = (observation.buckets[index] ?? 0) + 1;
    });
    this.durations.set(key, observation);

    if (route === '/auth/login') {
      if (statusCode === 200) this.increment('login_success_total');
      else if (statusCode === 401 || statusCode === 429) this.increment('login_failure_total');
    }
    if (route === '/exams' && method === 'POST' && statusCode >= 200 && statusCode < 300) {
      this.increment('exams_created_total');
    }
    if (/^\/exams\/:examId\/publish$/.test(route) && statusCode >= 200 && statusCode < 300) {
      this.increment('exams_published_total');
    }
    if (
      (route === '/attempts' || /^\/exams\/:examId\/attempts$/.test(route)) &&
      statusCode >= 200 &&
      statusCode < 300
    ) {
      this.increment('attempts_started_total');
    }
    if (/^\/attempts\/:attemptId\/finish$/.test(route) && statusCode >= 200 && statusCode < 300) {
      this.increment('attempts_finished_total');
    }
  }

  renderPrometheus(): string {
    const lines = [
      '# HELP requests_total Number of completed HTTP requests.',
      '# TYPE requests_total counter',
      ...this.renderCounters('requests_total'),
      '# HELP request_duration_ms HTTP request duration in milliseconds.',
      '# TYPE request_duration_ms histogram',
      ...this.renderHistograms(),
      ...this.renderNamedCounter('login_success_total', 'Successful login requests.'),
      ...this.renderNamedCounter('login_failure_total', 'Rejected login requests.'),
      ...this.renderNamedCounter('exams_created_total', 'Created mock exams.'),
      ...this.renderNamedCounter('exams_published_total', 'Published mock exams.'),
      ...this.renderNamedCounter('attempts_started_total', 'Started attempts.'),
      ...this.renderNamedCounter('attempts_finished_total', 'Finished attempts.'),
    ];
    return `${lines.join('\n')}\n`;
  }

  private renderCounters(name: string): string[] {
    return [...this.counters.entries()]
      .filter(([key]) => key.startsWith(`${name}{`))
      .map(([key, value]) => `${key} ${value}`);
  }

  private renderNamedCounter(name: string, help: string): string[] {
    return [
      `# HELP ${name} ${help}`,
      `# TYPE ${name} counter`,
      `${name} ${this.counters.get(name) ?? 0}`,
    ];
  }

  private renderHistograms(): string[] {
    const output: string[] = [];
    for (const [key, observation] of this.durations) {
      const baseLabels = key.slice('request_duration_ms'.length);
      HTTP_DURATION_BUCKETS.forEach((bucket, index) => {
        output.push(
          `request_duration_ms_bucket${this.withLabel(baseLabels, 'le', String(bucket))} ${observation.buckets[index]}`,
        );
      });
      output.push(
        `request_duration_ms_bucket${this.withLabel(baseLabels, 'le', '+Inf')} ${observation.count}`,
        `request_duration_ms_sum${baseLabels} ${observation.sum}`,
        `request_duration_ms_count${baseLabels} ${observation.count}`,
      );
    }
    return output;
  }

  private key(name: string, labels: Labels): string {
    const entries = Object.entries(labels).sort(([left], [right]) => left.localeCompare(right));
    if (entries.length === 0) return name;
    return `${name}{${entries.map(([key, value]) => `${key}="${this.escape(String(value))}"`).join(',')}}`;
  }

  private withLabel(labels: string, name: string, value: string): string {
    const content = labels.slice(1, -1);
    return `{${content ? `${content},` : ''}${name}="${this.escape(value)}"}`;
  }

  private escape(value: string): string {
    return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
  }
}
