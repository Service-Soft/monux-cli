import { AddAngularCommand } from './add-angular/add-angular.command';
import { AddAngularLibraryCommand } from './add-angular-library/add-angular-library.command';
import { AddTsLibraryCommand } from './add-ts-library';
import { AddConfiguration, AddType } from './models/add-configuration.model';
import { InquirerUtilities, QuestionsFor } from '../../encapsulation';
import { WorkspaceUtilities } from '../../workspace';
import { AddAngularWebsiteCommand } from './add-angular-website/add-angular-website.command';
import { AddLoopbackCommand } from './add-loopback/add-loopback.command';

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
    }
}