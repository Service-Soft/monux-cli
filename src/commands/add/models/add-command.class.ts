import { AddConfiguration } from './add-configuration.model';
import { InquirerUtilities, QuestionsFor } from '../../../encapsulation';
import { OmitStrict } from '../../../types';

/**
 *
 */
export abstract class AddCommand<ConfigurationType extends AddConfiguration = AddConfiguration> {

    protected abstract readonly configQuestions: QuestionsFor<OmitStrict<ConfigurationType, keyof AddConfiguration>>;

    constructor(protected readonly baseConfig: AddConfiguration) {}

    /**
     *
     * @param baseConfig
     * @param args
     */
    abstract run(...args: any[]): Promise<void>;

    /**
     *
     * @param baseConfig
     */
    protected async getConfig(): Promise<ConfigurationType> {
        return {
            ...await InquirerUtilities.prompt(this.configQuestions),
            ...this.baseConfig
        } as ConfigurationType;
    }
}