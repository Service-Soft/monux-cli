import { InquirerUtilities, PathUtilities, QuestionsFor } from '../../../encapsulation';
import { OmitStrict } from '../../../types';
import { WorkspaceUtilities } from '../../../workspace';
import { AddConfiguration } from './add-configuration.model';

/**
 * Base Add Command class.
 */
export abstract class BaseAddCommand<ConfigurationType extends AddConfiguration = AddConfiguration> {

    protected abstract readonly configQuestions: QuestionsFor<OmitStrict<ConfigurationType, keyof AddConfiguration>>;

    constructor(protected readonly baseConfig: AddConfiguration) {}

    /**
     * Adds the project to the workspace.
     */
    async add(): Promise<void> {
        // first, as the type of the project decides how its environment is generated while it is added.
        await WorkspaceUtilities.addProjectConfig(this.baseConfig.name, this.baseConfig.type, PathUtilities.resolve('.'));
        await this.run();
    }

    /**
     * Generates the project.
     */
    protected abstract run(): Promise<void>;

    /**
     * Gets the complete configuration.
     * Consists of the base config of the add cli command
     * and any additional config that is needed based on this.configQuestions.
     * @returns The combination of the base- and the additional configuration.
     */
    protected async getConfig(): Promise<ConfigurationType> {
        return {
            ...await InquirerUtilities.prompt(this.configQuestions),
            ...this.baseConfig
        } as ConfigurationType;
    }
}
