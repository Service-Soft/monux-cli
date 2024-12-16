import { Dirent } from 'fs';
import path from 'path';

import { GIT_IGNORE_FILE_NAME, LIBS_DIRECTORY_NAME, TS_CONFIG_FILE_NAME } from '../../../constants';
import { CPUtilities, FsUtilities, QuestionsFor } from '../../../encapsulation';
import { EslintUtilities } from '../../../eslint';
import { NpmPackage, NpmUtilities } from '../../../npm';
import { TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { WorkspaceConfig, WorkspaceUtilities } from '../../../workspace';
import { AddCommand } from '../models/add-command.class';
import { AddConfiguration } from '../models/add-configuration.model';

/**
 * Configuration for creating a new ts library.
 */
type TsLibraryConfiguration = AddConfiguration & {
    /**
     * The scope of the library, eg. '@project'.
     */
    scope: string
};

/**
 * The command for adding a typescript library to the monorepo.
 */
export class AddTsLibraryCommand extends AddCommand<TsLibraryConfiguration> {
    protected override configQuestions: QuestionsFor<OmitStrict<TsLibraryConfiguration, keyof AddConfiguration>> = {
        scope: {
            type: 'input',
            required: true,
            message: 'scope',
            default: async () => {
                const workspaceConfig: WorkspaceConfig = await WorkspaceUtilities.getConfigOrFail();
                return `@${workspaceConfig.name}`;
            }
        }
    };

    override async run(): Promise<void> {
        const config: TsLibraryConfiguration = await this.getConfig();
        const root: string = await this.createProject(config);
        // await FsUtilities.mkdir(path.join(root, 'src'));
        // await FsUtilities.createFile(path.join(root, 'src', 'index.ts'), '');

        await Promise.all([
            EslintUtilities.setupProjectEslint(root, false, TS_CONFIG_FILE_NAME),
            // this.setupTsConfig(config.name),
            // this.updateBaseTsConfig(config, root),
            FsUtilities.rm(path.join(root, GIT_IGNORE_FILE_NAME)),
            FsUtilities.rm(path.join(root, 'index.html')),
            FsUtilities.rm(path.join(root, 'public')),
            FsUtilities.rm(path.join(root, 'src', 'counter.ts')),
            FsUtilities.rm(path.join(root, 'src', 'style.css')),
            FsUtilities.rm(path.join(root, 'src', 'typescript.svg')),
            FsUtilities.rm(path.join(root, 'src', 'main.ts'))
        ]);

        await FsUtilities.createFile(path.join(root, 'src', 'index.ts'), '');
        await NpmUtilities.install(config.name, [NpmPackage.VITE_PLUGIN_DTS], true);
        await NpmUtilities.run(config.name, 'build');
        await this.installInProjects(config);
    }

    private async installInProjects(config: TsLibraryConfiguration): Promise<void> {
        const projects: Dirent[] = await WorkspaceUtilities.getProjects('apps');
        const npmPackage: string = `${config.scope}/${config.name}`;
        await Promise.all(projects.map((p) => NpmUtilities.install(p.name, [npmPackage as NpmPackage])));
    }

    // private async updateBaseTsConfig(config: TsLibraryConfiguration, root: string): Promise<void> {
    //     await TsConfigUtilities.updateBaseTsConfig({
    //         compilerOptions: {
    //             paths: {
    //                 [`${config.scope}/${config.name}`]: [root]
    //             }
    //         }
    //     });
    // }

    private async setupTsConfig(projectName: string): Promise<void> {
        // eslint-disable-next-line no-console
        console.log('sets up tsconfig');
        await TsConfigUtilities.updateTsConfig(
            projectName,
            {
                extends: '../../tsconfig.base.json',
                compilerOptions: {
                    composite: true,
                    declaration: true,
                    outDir: './build',
                    rootDir: './src'
                },
                include: undefined
            }
        );
    }

    private async createProject(config: TsLibraryConfiguration): Promise<string> {
        // eslint-disable-next-line no-console
        console.log('Creates the library');
        CPUtilities.execSync(`cd ${LIBS_DIRECTORY_NAME} && npm create vite@latest ${config.name} -- --template vanilla-ts`);
        const libraryPath: string = path.join(LIBS_DIRECTORY_NAME, config.name);
        await FsUtilities.createFile(path.join(libraryPath, 'vite.config.ts'), [
            'import { defineConfig } from \'vite\';',
            'import path from \'path\';',
            'import dts from \'vite-plugin-dts\';',
            '',
            'export default defineConfig({',
            '\tplugins: [',
            '\t\tdts({',
            '\t\t\tinsertTypesEntry: true',
            '\t\t})',
            '\t],',
            '\tbuild: {',
            '\t\tlib: {',
            '\t\t\tentry: path.join(__dirname, \'src\', \'index.ts\'),',
            `\t\t\tname: '${config.name}',`,
            `\t\t\tfileName: '${config.name}'`,
            '\t\t}',
            '\t}',
            '});'
        ]);
        await NpmUtilities.updatePackageJson(
            config.name,
            {
                name: `${config.scope}/${config.name}`,
                files: ['dist'],
                main: `./dist/${config.name}.umd.cjs`,
                module: `./dist/${config.name}.js`,
                exports: {
                    '.': {
                        types: './dist/index.d.ts',
                        import: `./dist/${config.name}.js`,
                        require: `./dist/${config.name}.umd.cjs`
                    }
                }
            }
        );
        return libraryPath;
    }
}