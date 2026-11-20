import { cspellOptions } from '@service-soft/eslint-config';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import { getDefaultSelectors } from 'eslint-plugin-better-tailwindcss/defaults';

import baseConfig from '../../eslint.config.mjs';

// eslint-disable-next-line jsdoc/require-description
/** @type {import('eslint').Linter.Config} */
export default [
    ...baseConfig,
    { ignores: ['dist', '.angular'] },
    {
        files: ['**/*.ts'],
        languageOptions: {
            parserOptions: {
                project: ['tsconfig.eslint.json']
            }
        }
    },
    {
        rules: {
            // the components and pages document themselves by their templates
            'jsdoc/require-jsdoc': 'off',
            'cspell/spellchecker': [
                'warn',
                {
                    ...cspellOptions,
                    customWordListFile: '../../cspell.words.txt'
                }
            ]
        }
    },
    {
        files: ['**/*.html'],
        rules: {
            // reading signals in templates is a call expression
            'angular/no-call-expression': 'off'
        }
    },
    {
        files: ['**/*.ts'],
        rules: {
            'angular/component-selector': ['warn', { style: 'kebab-case', type: 'element', prefix: 'app' }],
            'angular/directive-selector': ['warn', { style: 'camelCase', type: 'attribute', prefix: 'app' }]
        }
    },
    {
        // classes are only the tokens of the theme, written out completely, so tailwind finds them
        files: ['src/**/*.ts', 'src/**/*.html'],
        plugins: {
            'better-tailwindcss': betterTailwindcss
        },
        settings: {
            'better-tailwindcss': {
                entryPoint: 'src/styles.css',
                selectors: [
                    ...getDefaultSelectors(),
                    {
                        kind: 'callee',
                        name: '^(Component|Directive)$',
                        match: [{ type: 'objectValues', path: String.raw`^host\.class$` }]
                    },
                    {
                        kind: 'variable',
                        name: '^[A-Z_]+_CLASSES$',
                        match: [{ type: 'strings' }, { type: 'objectValues' }]
                    }
                ]
            }
        },
        rules: {
            'better-tailwindcss/no-unknown-classes': 'warn',
            'better-tailwindcss/no-concatenated-classes': 'warn',
            'better-tailwindcss/enforce-consistent-line-wrapping': ['warn', { printWidth: 140, indent: 4, preferSingleLine: true }],
            'better-tailwindcss/no-restricted-classes': [
                'warn',
                {
                    restrict: [
                        {
                            pattern: String.raw`\[(#|[a-z]+\(|var\()|\(--`,
                            message: 'Arbitrary colors and css variables bypass the tokens of the theme.'
                                + ' Use or add a token in theme.css instead.'
                        }
                    ]
                }
            ]
        }
    }
];
