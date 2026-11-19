import { InquirerUtilities } from '../../encapsulation';
import { BaseCommand } from '../base-command.model';
import { AddAngularCommand } from './add-angular';
import { AddAngularLibraryCommand } from './add-angular-library';
import { AddAngularWebsiteCommand } from './add-angular-website';
import { AddLoopbackCommand } from './add-loopback';
import { AddNestCommand } from './add-nest';
import { AddTsLibraryCommand } from './add-ts-library';
import { AddWordpressCommand } from './add-wordpress';
import { AddZibriCommand } from './add-zibri';
import { AddConfiguration, addConfigurationQuestions, AddType } from './models';

/**
 * Adds a new project to the current monorepo.
 */
export class AddCommand extends BaseCommand<AddConfiguration> {
    protected override readonly insideWorkspace: boolean = true;

    protected override async run(config: AddConfiguration): Promise<void> {
        switch (config.type) {
            case AddType.ANGULAR: {
                await new AddAngularCommand(config).add();
                return;
            }
            case AddType.ANGULAR_LIBRARY: {
                await new AddAngularLibraryCommand(config).add();
                return;
            }
            case AddType.ANGULAR_WEBSITE: {
                await new AddAngularWebsiteCommand(config).add();
                return;
            }
            case AddType.LOOPBACK: {
                await new AddLoopbackCommand(config).add();
                return;
            }
            case AddType.NEST: {
                await new AddNestCommand(config).add();
                return;
            }
            case AddType.ZIBRI: {
                await new AddZibriCommand(config).add();
                return;
            }
            case AddType.TS_LIBRARY: {
                await new AddTsLibraryCommand(config).add();
                return;
            }
            case AddType.WORDPRESS: {
                await new AddWordpressCommand(config).add();
                return;
            }
        }
    }

    protected override async resolveInput(): Promise<AddConfiguration> {
        return await InquirerUtilities.prompt(addConfigurationQuestions);
    }
}