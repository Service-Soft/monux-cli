import { createRequire } from 'node:module';

// runs jest wherever npm installed it: inside an npm workspace, that is the node_modules of the root of the workspace,
// which the "./node_modules/jest/bin/jest.js" of the scripts Nest generates does not find
const require = createRequire(import.meta.url);
await import(require.resolve('jest/bin/jest'));
