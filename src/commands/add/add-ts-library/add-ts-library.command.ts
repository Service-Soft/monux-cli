
import { GIT_IGNORE_FILE_NAME, LIBS_DIRECTORY_NAME, TS_CONFIG_FILE_NAME } from '../../../constants';
import { CPUtilities, FsUtilities, QuestionsFor } from '../../../encapsulation';
import { EslintUtilities } from '../../../eslint';
import { NpmPackage, NpmUtilities } from '../../../npm';
import { TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
import { getPath } from '../../../utilities';
import { WorkspaceConfig, WorkspaceProject, WorkspaceUtilities } from '../../../workspace';
import { AddConfiguration, BaseAddCommand } from '../models';

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
export class AddTsLibraryCommand extends BaseAddCommand<TsLibraryConfiguration> {
    private readonly VITE_VERSION: number = 6;

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

        await Promise.all([
            EslintUtilities.setupProjectEslint(root, false, TS_CONFIG_FILE_NAME),
            this.updateBaseTsConfig(config, root),
            FsUtilities.rm(getPath(root, GIT_IGNORE_FILE_NAME)),
            FsUtilities.rm(getPath(root, 'index.html')),
            FsUtilities.rm(getPath(root, 'public')),
            FsUtilities.rm(getPath(root, 'src', 'counter.ts')),
            FsUtilities.rm(getPath(root, 'src', 'style.css')),
            FsUtilities.rm(getPath(root, 'src', 'typescript.svg')),
            FsUtilities.rm(getPath(root, 'src', 'main.ts'))
        ]);

        await FsUtilities.createFile(getPath(root, 'src', 'index.ts'), '');
        await NpmUtilities.install(config.name, [NpmPackage.VITE_PLUGIN_DTS], true);
        await NpmUtilities.run(config.name, 'build');
        await this.installInProjects(config);
    }

    private async installInProjects(config: TsLibraryConfiguration): Promise<void> {
        const projects: WorkspaceProject[] = await WorkspaceUtilities.getProjects('apps', getPath('.'));
        const npmPackage: string = `${config.scope}/${config.name}`;
        await Promise.all(projects.map((p) => NpmUtilities.install(p.name, [npmPackage as NpmPackage])));
    }

    private async updateBaseTsConfig(config: TsLibraryConfiguration, root: string): Promise<void> {
        await TsConfigUtilities.updateBaseTsConfig({
            compilerOptions: {
                paths: {
                    [`${config.scope}/${config.name}`]: [`${root}/src/index.ts`]
                }
            }
        });
    }

    private async createProject(config: TsLibraryConfiguration): Promise<string> {
        // eslint-disable-next-line no-console
        console.log('Creates the library');
        CPUtilities.execSync(`cd ${LIBS_DIRECTORY_NAME} && npm create vite@${this.VITE_VERSION} ${config.name} -- --template vanilla-ts`);
        const libraryPath: string = getPath(LIBS_DIRECTORY_NAME, config.name);
        await FsUtilities.createFile(getPath(libraryPath, 'vite.config.ts'), [
            'import { defineConfig, PluginOption } from \'vite\';',
            'import path from \'path\';',
            `import dts from '${NpmPackage.VITE_PLUGIN_DTS}';`,
            '',
            'export default defineConfig({',
            '\tplugins: [',
            '\t\tdts({',
            '\t\t\tinsertTypesEntry: true',
            '\t\t}) as PluginOption',
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
        // const originalPackageJson: PackageJson = await FsUtilities.parseFileAs(getPath(libraryPath, PACKAGE_JSON_FILE_NAME));
        await NpmUtilities.updatePackageJson(
            config.name,
            {
                name: `${config.scope}/${config.name}`,
                files: ['dist'],
                main: `./dist/${config.name}.umd.cjs`,
                module: `./dist/${config.name}.js`,
                scripts: {
                    watch: 'tsc && vite build --watch'
                },
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