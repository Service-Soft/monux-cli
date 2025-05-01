
// eslint-disable-next-line jsdoc/require-jsdoc
export const loopbackViteContent: string = `import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [tsconfigPaths()],
    build: {
        ssr: 'src/index.ts',
        target: 'node20',
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                format: 'cjs',
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                inlineDynamicImports: true
            }
        }
    }
});`;