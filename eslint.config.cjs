const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [{ ignores: ['dist', 'coverage', 'eslint.config.cjs'] }, ...tsPlugin.configs['flat/recommended-type-checked'], {
    files: ['**/*.ts'],
    languageOptions: {
        parser: tsParser,
        parserOptions: { project: ['./tsconfig.json'], tsconfigRootDir: __dirname, sourceType: 'module' },
        ecmaVersion: 2022,
        globals: { console: 'readonly', module: 'readonly', process: 'readonly', require: 'readonly' }
    },
    rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
}, {
    files: ['src/**/*.ts'],
    rules: {
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/typedef': ['error', { arrowParameter: true, variableDeclaration: true }]
    }
}, {
    files: ['tests/**/*.ts'],
    languageOptions: { globals: { afterEach: 'readonly', describe: 'readonly', expect: 'readonly', it: 'readonly', vi: 'readonly' } },
    rules: { '@typescript-eslint/unbound-method': 'off' }
}];
