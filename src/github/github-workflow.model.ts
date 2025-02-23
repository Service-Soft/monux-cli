/**
 * Definition for a yaml github workflow file.
 */
export type GithubWorkflow = {
    /**
     * The workflow name.
     */
    name: string,
    /**
     * Event triggers.
     */
    on: string | string[] | GithubWorkflowTriggers,
    /**
     * Defines the jobs executed by the workflow.
     */
    jobs: Record<string, GithubWorkflowJob>
};

/**
 * Possible triggers for activating a workflow.
 */
type GithubWorkflowTriggers = {
    /**
     * Trigger workflow on push events.
     */
    push?: GithubWorkflowTriggerBranches,
    /**
     * Trigger workflow on pull request events.
     */
    pull_request?: GithubWorkflowTriggerBranches,
    /**
     * Manually trigger workflow.
     */
    workflow_dispatch?: Record<string, unknown>
};

/**
 * Trigger conditions for a github actions workflow.
 */
type GithubWorkflowTriggerBranches = {
    /**
     * Branches to include.
     */
    branches?: string[],
    /**
     * Branches to ignore.
     */
    branches_ignore?: string[],
    /**
     * Tags to include.
     */
    tags?: string[],
    /**
     * Tags to ignore.
     */
    tags_ignore?: string[],
    /**
     * Paths to include.
     */
    paths?: string[],
    /**
     * Paths to ignore.
     */
    paths_ignore?: string[]
};

/**
 * A job of a workflow.
 */
type GithubWorkflowJob = {
    /**
     * Job name.
     */
    name?: string,
    /**
     * The type of machine to run the job on.
     */
    'runs-on': 'ubuntu-latest',
    /**
     * Dependencies on other jobs.
     */
    needs?: string[],
    /**
     * Condition to run the job.
     */
    if?: string,
    /**
     * Strategy for running the job.
     */
    strategy?: {
        /**
         * Matrix strategy for job variations.
         */
        matrix: Record<string, string[]>,
        /**
         * Stop all matrix jobs if one fails.
         */
        'fail-fast'?: boolean
    },
    /**
     * Steps to execute within the job.
     */
    steps: GithubWorkflowStep[],
    /**
     * Environment variables for the job.
     */
    env?: Record<string, string>,
    /**
     * Timeout for the job in minutes.
     */
    'timeout-minutes'?: number
};

/**
 * A step of a github actions workflow.
 */
type GithubWorkflowStep = {
    /**
     * Step name.
     */
    name?: string,
    /**
     * Condition to run the step.
     */
    if?: string,
    /**
     * Command to execute.
     */
    run?: string,
    /**
     * Action to use in the step.
     */
    uses?: string,
    /**
     * Inputs for the action.
     */
    with?: Record<string, string>,
    /**
     * Environment variables for the step.
     */
    env?: Record<string, string>,
    /**
     * Continue even if the step fails.
     */
    'continue-on-error'?: boolean,
    /**
     * Timeout for the step in minutes.
     */
    'timeout-minutes'?: number
};