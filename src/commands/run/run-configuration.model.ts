/**
 * Configuration for the run command.
 */
export type RunConfiguration = {
    /**
     * Whether or not the command to run is native (like "npm install") or not (like "npm run {myScript}").
     */
    isNativeCommand: boolean,
    /**
     * The name of the Monux project.
     */
    projectName: string,
    /**
     * The commands as a single concatenated string.
     */
    commands: string
};