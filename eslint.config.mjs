import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Boundary rules from docs/ARCHITECTURE.md section 3.
// Each restricted-* rule may appear only once per file scope (a later config block
// replaces an earlier one for the same rule), so blocks below are assembled from
// shared constants and every block lists the complete rule set for its glob.

const LAYERS = ['ui', 'application', 'data', 'platform', 'app'];

const importGroup = (layers) => [
  ...layers.map((l) => `@/${l}`),
  ...layers.map((l) => `@/${l}/*`),
  // relative escapes into another layer, from any depth
  ...layers.map((l) => `**/${l}`),
  ...layers.map((l) => `**/${l}/*`),
];

const restrictedImports = (extra = []) => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: importGroup(LAYERS),
          message: 'src/domain must not import from other layers.',
        },
        ...extra,
      ],
      paths: [
        { name: 'react', message: 'src/domain must not import React.' },
        { name: 'react-dom', message: 'src/domain must not import React.' },
        { name: 'next', message: 'src/domain must not import Next.' },
      ],
    },
  ],
});

const domainImportPatterns = [
  { group: ['react/*', 'react-dom/*', 'next/*'], message: 'src/domain must not import React or Next.' },
];
const jalaliPattern = {
  group: ['jalaali-js', 'jalaali-js/*'],
  message: 'Only src/domain/calendar may import jalaali-js.',
};

const STORAGE_GLOBALS = ['localStorage', 'sessionStorage'];
const storageGlobals = {
  'no-restricted-globals': [
    'error',
    ...STORAGE_GLOBALS.map((name) => ({
      name,
      message: 'Only src/data/local and src/data/session may use web storage.',
    })),
  ],
};
const storageProperties = STORAGE_GLOBALS.flatMap((property) =>
  ['window', 'globalThis', 'self'].map((object) => ({
    object,
    property,
    message: 'Only src/data/local and src/data/session may use web storage.',
  })),
);

const domainProperties = [
  { object: 'Date', property: 'now', message: 'Time is injected through Clock; do not call Date.now in src/domain.' },
  { object: 'performance', property: 'now', message: 'Time is injected through Clock; do not call performance.now in src/domain.' },
  { object: 'Math', property: 'random', message: 'IDs and randomness are injected; do not call Math.random in src/domain.' },
];

const noArgDate = {
  selector: "NewExpression[callee.name='Date'][arguments.length=0]",
  message: 'Time is injected through Clock; do not call new Date() without arguments in src/domain.',
};

// Physical Tailwind direction classes (allows variant prefixes and a leading minus).
const PHYSICAL =
  '(^|[\\s:!])-?((m|p)(l|r)-|left-|right-|text-(left|right)([\\s]|$)|(rounded|border)-(l|r)([\\s-]|$))';
const physicalMessage =
  'Use logical Tailwind classes (ms-, me-, ps-, pe-, start-, end-, text-start, text-end, rounded-s/e, border-s/e).';
const uiSyntax = [
  { selector: `Literal[value=/${PHYSICAL}/]`, message: physicalMessage },
  { selector: `TemplateElement[value.raw=/${PHYSICAL}/]`, message: physicalMessage },
  {
    selector: 'JSXText[value=/\\S/]',
    message: 'No text literals in JSX. Use t(\'key\') from the i18n system.',
  },
];

const config = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'node_modules/**', 'next-env.d.ts', 'docs/**', 'coverage/**']),

  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      ...restrictedImports([...domainImportPatterns, jalaliPattern]),
      'no-restricted-properties': ['error', ...domainProperties],
      'no-restricted-syntax': ['error', noArgDate],
    },
  },
  {
    // Only domain/calendar may import the Jalali library.
    files: ['src/domain/calendar/**/*.{ts,tsx}'],
    rules: restrictedImports(domainImportPatterns),
  },
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/data', '@/data/*', '@/platform', '@/platform/*', '**/data', '**/data/*', '**/platform', '**/platform/*'],
              message: 'UI must not import data or platform. Go through application.',
            },
          ],
        },
      ],
      ...storageGlobals,
      'no-restricted-properties': ['error', ...storageProperties],
      'no-restricted-syntax': ['error', ...uiSyntax],
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/application/**/*.{ts,tsx}', 'src/platform/**/*.{ts,tsx}'],
    rules: {
      ...storageGlobals,
      'no-restricted-properties': ['error', ...storageProperties],
    },
  },
]);

export default config;
