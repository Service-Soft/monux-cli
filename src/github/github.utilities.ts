import { FsUtilities, PathUtilities, Path, YamlUtilities } from '../encapsulation';
import { GithubWorkflow } from './github-workflow.model';

/**
 * Utilities for github.
 */
export abstract class GithubUtilities {
    /**
     * The name of the workflow.
     * @param data - The data of the workflow to create.
     */
    static async createWorkflow(data: GithubWorkflow): Promise<void> {
        const workflowFilePath: Path = PathUtilities.resolve('.github', 'workflows', `${data.name}.yml`);
        await this.createWorkflowFile(workflowFilePath, data);
    }

    private static async createWorkflowFile(workflowFilePath: Path, data: GithubWorkflow): Promise<void> {
        await FsUtilities.createFile(workflowFilePath, YamlUtilities.stringify(data));
        await FsUtilities.replaceInFile(workflowFilePath, '\'on\'', 'on');
    }
}