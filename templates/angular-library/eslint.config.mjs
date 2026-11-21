import { cspellOptions } from '@service-soft/eslint-config';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import { getDefaultSelectors } from 'eslint-plugin-better-tailwindcss/defaults';

import baseConfig from '../../eslint.config.mjs';

// eslint-disable-next-line jsdoc/require-description
/** @type {import('eslint').Linter.Config} */
export default [
    ...baseConfig,
    { ignores: ['dist', 'storybook-static', 'out-tsc', '.angular'] },
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
        files: ['**/*.stories.ts'],
        rules: {
            // stories are documentation themselves
            'jsdoc/require-jsdoc': 'off',
            // stories render inline templates anyway
            'angular/component-max-inline-declarations': 'off'
        }
    },
    {
        files: ['**/*.ts'],
        rules: {
            // attribute selectors keep native elements like button as the host, like in @service-soft/ui
            'angular/component-selector': ['warn', { style: 'kebab-case', type: ['element', 'attribute'], prefix: '{{=prefix}}' }],
            'angular/directive-selector': ['warn', { style: 'camelCase', type: 'attribute', prefix: '{{=prefix}}' }]
        }
    },
    {
        // only the tokens of @service-soft/ui and of the workspace, written out completely, so tailwind finds them
        files: ['**/*.ts', '**/*.html'],
        ignores: ['tests/**', '.storybook/**'],
        plugins: {
            'better-tailwindcss': betterTailwindcss
        },
        settings: {
            'better-tailwindcss': {
                entryPoint: 'lint.css',
                selectors: [
                    ...getDefaultSelectors(),
                    {
                        kind: 'callee',
                        name: '^(Component|Directive)$',
                        match: [{ type: 'objectValues', path: String.raw`^host\.class$` }]
                    },
                    {
                        // class lists picked at runtime, like the classes of each variant
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
                                + ' Use or add a token in the theme.css of the workspace instead.'
                        }
                    ]
                }
            ]
        }
    }
];
