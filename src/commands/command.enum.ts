/**
 * All commands that the cli supports.
 */
export enum Command {
    HELP = 'help',
    H = 'h',
    VERSION = 'version',
    V = 'v',
    INIT = 'init',
    I = 'i',
    ADD = 'add',
    A = 'a',
    PREPARE = 'prepare',
    P = 'p',
    UP = 'up',
    U = 'u',
    DOWN = 'down',
    D = 'd',
    GENERATE_PAGE = 'generatePage',
    GP = 'gp',
    GENERATE_COMPONENT = 'generateComponent',
    GC = 'gc',
    RUN_ALL = 'run-all',
    RUN_MANY = 'run-many',
    RA = 'ra',
    LIST = 'list',
    LS = 'ls',
    LIST_ALL = 'list-all',
    LA = 'la'
}