import coreWebVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  { ignores: ['node_modules/**', '.next/**', 'out/**', '*.html'] },
  ...coreWebVitals,
  {
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'react/no-unescaped-entities': 'off',
    },
  },
];

export default eslintConfig;