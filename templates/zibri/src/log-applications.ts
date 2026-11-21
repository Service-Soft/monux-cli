import { LogApplication } from '{{=contractPackage}}';

/**
 * The apps of the workspace that send their logs to this api. Monux adds every app it generates for this api to the
 * LogApplication of its contract library.
 */
export const LOG_APPLICATIONS: string[] = Object.values(LogApplication);
