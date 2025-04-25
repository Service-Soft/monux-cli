
// eslint-disable-next-line jsdoc/require-jsdoc
export const loopbackWebpackContent: string = `const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = {
    // Adapted entry: points at LoopBack’s src/index.ts
    entry: path.join(__dirname, 'src', 'index.ts'),
    target: 'node',
    mode: 'none',
    devtool: false,
    externalsPresets: { node: true },
    externals: [nodeExternals()],
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    ignoreWarnings: [/^(?!CriticalDependenciesWarning$)/],
    node: { __filename: false, __dirname: false },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true,
                            configFile: 'tsconfig.json'
                        }
                    }
                ]
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            cldr$: 'cldrjs',
            cldr: 'cldrjs/dist/cldr',
            'cldr/event$': 'cldrjs/dist/cldr/event',
            'cldr/supplemental$': 'cldrjs/dist/cldr/supplemental'
        },
        plugins: [new TsconfigPathsPlugin({ configFile: 'tsconfig.json' })]
    },
    optimization: { nodeEnv: false },
    plugins: [
        new ForkTsCheckerWebpackPlugin({
            typescript: { configFile: 'tsconfig.json' }
        }),
        new webpack.BannerPlugin({
            banner: '#!/usr/bin/env node',
            raw: true
        })
    ]
};`;