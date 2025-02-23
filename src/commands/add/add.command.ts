import { AddAngularCommand } from './add-angular';
import { AddAngularLibraryCommand } from './add-angular-library';
import { AddAngularWebsiteCommand } from './add-angular-website';
import { AddLoopbackCommand } from './add-loopback';
import { AddTsLibraryCommand } from './add-ts-library';
import { AddWordpressCommand } from './add-wordpress';
import { AddConfiguration, AddType } from './models';
import { InquirerUtilities, QuestionsFor } from '../../encapsulation';
import { WorkspaceUtilities } from '../../workspace';

const addConfigQuestions: QuestionsFor<AddConfiguration> = {
    type: {
        type: 'select',
        choices: Object.values(AddType),
        message: 'type'
    },
    name: {
        type: 'input',
        message: 'name',
        required: true,
        validate: async (input: string) => await WorkspaceUtilities.findProject(input) == undefined
    }
};

/**
 * Runs the add cli command.
 */
export async function runAdd(): Promise<void> {
    const config: AddConfiguration = await InquirerUtilities.prompt(addConfigQuestions);

    switch (config.type) {
        case AddType.ANGULAR: {
            await new AddAngularCommand(config).run();
            return;
        }
        case AddType.ANGULAR_LIBRARY: {
            await new AddAngularLibraryCommand(config).run();
            return;
        }
        case AddType.ANGULAR_WEBSITE: {
            await new AddAngularWebsiteCommand(config).run();
            return;
        }
        case AddType.LOOPBACK: {
            await new AddLoopbackCommand(config).run();
            return;
        }
        case AddType.TS_LIBRARY: {
            await new AddTsLibraryCommand(config).run();
            return;
        }
        case AddType.WORDPRESS: {
            await new AddWordpressCommand(config).run();
            return;
        }
    }
}