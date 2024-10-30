import { AddAngularCommand } from './add-angular';
import { addAngularLibrary } from './add-angular-library/add-angular-library.function';
import { addAngularWebsite } from './add-angular-website/add-angular-website.function';
import { addLoopback } from './add-loopback/add-loopback.function';
import { addTsLibrary } from './add-ts-library';
import { AddConfiguration, AddType } from './models/add-configuration.model';
import { InquirerUtilities, QuestionsFor } from '../../encapsulation';
import { WorkspaceUtilities } from '../../workspace';

const addConfigQuestions: QuestionsFor<AddConfiguration> = {
    name: {
        type: 'input',
        message: 'name',
        required: true,
        validate: async (input: string) => await WorkspaceUtilities.findProject(input) == undefined
    },
    type: {
        type: 'select',
        choices: Object.values(AddType),
        message: 'type'
    }
};

/**
 *
 */
export async function runAdd(): Promise<void> {
    const config: AddConfiguration = await InquirerUtilities.prompt(addConfigQuestions);

    switch (config.type) {
        case AddType.ANGULAR: {
            await new AddAngularCommand(config).run();
            return;
        }
        case AddType.ANGULAR_LIBRARY: {
            await addAngularLibrary(config);
            return;
        }
        case AddType.ANGULAR_WEBSITE: {
            await addAngularWebsite(config);
            return;
        }
        case AddType.LOOPBACK: {
            await addLoopback(config);
            return;
        }
        case AddType.TS_LIBRARY: {
            await addTsLibrary(config);
            return;
        }
    }
}