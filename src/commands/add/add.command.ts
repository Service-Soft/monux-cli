import { AddAngularCommand } from './add-angular';
import { AddAngularLibraryCommand } from './add-angular-library';
import { AddAngularWebsiteCommand } from './add-angular-website';
import { AddLoopbackCommand } from './add-loopback';
import { AddTsLibraryCommand } from './add-ts-library';
import { AddWordpressCommand } from './add-wordpress';
import { AddConfiguration, addConfigurationQuestions, AddType } from './models';
import { InquirerUtilities } from '../../encapsulation';
import { BaseCommand } from '../base-command.model';
import { AddNestCommand } from './add-nest';

/**
 * Adds a new project to the current monorepo.
 */
export class AddCommand extends BaseCommand<AddConfiguration> {
    protected override readonly insideWorkspace: boolean = true;

    protected override async run(config: AddConfiguration): Promise<void> {
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
            case AddType.NEST: {
                await new AddNestCommand(config).run();
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

    protected override async resolveInput(): Promise<AddConfiguration> {
        return await InquirerUtilities.prompt(addConfigurationQuestions);
    }
}