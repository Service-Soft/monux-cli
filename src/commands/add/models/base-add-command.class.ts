import { AddConfiguration } from './add-configuration.model';
import { InquirerUtilities, QuestionsFor } from '../../../encapsulation';
import { OmitStrict } from '../../../types';

/**
 * Base Add Command class.
 */
export abstract class BaseAddCommand<ConfigurationType extends AddConfiguration = AddConfiguration> {

    protected abstract readonly configQuestions: QuestionsFor<OmitStrict<ConfigurationType, keyof AddConfiguration>>;

    constructor(protected readonly baseConfig: AddConfiguration) {}

    /**
     * Generates the project.
     */
    abstract run(): Promise<void>;

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