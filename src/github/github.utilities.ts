
import yaml from 'js-yaml';

import { FsUtilities } from '../encapsulation';
import { GithubWorkflow } from './github-workflow.model';
import { getPath } from '../utilities';

/**
 * Utilities for github.
 */
export abstract class GithubUtilities {
    /**
     * The name of the workflow.
     * @param data - The data of the workflow to create.
     */
    static async createWorkflow(data: GithubWorkflow): Promise<void> {
        const workflowFilePath: string = getPath('.github', 'workflows', `${data.name}.yml`);
        await this.createWorkflowFile(workflowFilePath, data);
    }

    private static async createWorkflowFile(workflowFilePath: string, data: GithubWorkflow): Promise<void> {
        await FsUtilities.createFile(workflowFilePath, yaml.dump(data, { indent: 4 }));
        await FsUtilities.replaceInFile(workflowFilePath, '\'on\'', 'on');
    }
}