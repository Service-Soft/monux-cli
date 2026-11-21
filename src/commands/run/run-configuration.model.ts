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
     * The npm script, or the native command, like "install".
     */
    command: string,
    /**
     * What follows it: the arguments of the script, or of npm for a native command, like the package to install.
     */
    args: string[]
};