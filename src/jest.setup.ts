import { jest } from '@jest/globals';

jest.mock('inquirer', () => ({
    __esModule: true,
    default: {
        prompt: jest.fn()
    }
}));

global.console = {
    ...console,
    // uncomment to ignore a specific log level
    log: jest.fn(),
    // debug: jest.fn(),
    info: jest.fn()
    // warn: jest.fn(),
    // error: jest.fn(),
};