module.exports = {
  forbidden: [
    {
      name: 'no-cycles',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'questions-must-not-import-attempts',
      severity: 'error',
      from: { path: '^packages/modules/questions' },
      to: { path: '^packages/modules/attempts' },
    },
    {
      name: 'attempts-must-not-import-schools',
      severity: 'error',
      from: { path: '^packages/modules/attempts' },
      to: { path: '^packages/modules/schools' },
    },
    {
      name: 'rankings-must-not-import-question-persistence',
      severity: 'error',
      from: { path: '^packages/modules/rankings' },
      to: { path: '^packages/modules/questions/(domain|infrastructure|persistence|repository)' },
    },
    {
      name: 'shared-types-no-infrastructure',
      severity: 'error',
      from: { path: '^packages/shared-types' },
      to: { path: '(prisma|repository|entity|service)' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: { extensions: ['.ts', '.tsx', '.js', '.jsx'] },
    includeOnly: '^((apps|packages)/)',
  },
};
