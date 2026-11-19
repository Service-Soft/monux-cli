import { BASE_TS_CONFIG_FILE_NAME, GIT_IGNORE_FILE_NAME, LIBS_DIRECTORY_NAME } from '../../../constants';
import { CPUtilities, FsUtilities, JsonUtilities, QuestionsFor, PathUtilities, LogUtilities } from '../../../encapsulation';
import { EslintUtilities } from '../../../eslint';
import { NpmPackage, NpmUtilities } from '../../../npm';
import { TsConfig, TsConfigUtilities } from '../../../tsconfig';
import { OmitStrict } from '../../../types';
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
            name: 'scope',
            message: 'scope',
            validate: (v?: string) => !!v,
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
            EslintUtilities.setupProjectEslint(root, false),
            this.setupTsConfig(config, root),
            FsUtilities.rm(PathUtilities.resolve(root, GIT_IGNORE_FILE_NAME)),
            FsUtilities.rm(PathUtilities.resolve(root, 'index.html')),
            FsUtilities.rm(PathUtilities.resolve(root, 'public')),
            FsUtilities.rm(PathUtilities.resolve(root, 'src', 'counter.ts')),
            FsUtilities.rm(PathUtilities.resolve(root, 'src', 'style.css')),
            FsUtilities.rm(PathUtilities.resolve(root, 'src', 'typescript.svg')),
            FsUtilities.rm(PathUtilities.resolve(root, 'src', 'main.ts'))
        ]);

        await FsUtilities.createFile(PathUtilities.resolve(root, 'src', 'index.ts'), '');
        await NpmUtilities.run(config.name, 'build', false);
        await this.installInProjects(config);
    }

    private async installInProjects(config: TsLibraryConfiguration): Promise<void> {
        const projects: WorkspaceProject[] = await WorkspaceUtilities.getProjects('apps', PathUtilities.resolve('.'));
        const npmPackage: string = `${config.scope}/${config.name}`;
        await Promise.all(projects.map((p) => NpmUtilities.install(p.name, [npmPackage as NpmPackage])));
    }

    private async setupTsConfig(config: TsLibraryConfiguration, root: string): Promise<void> {
        await TsConfigUtilities.updateBaseTsConfig({
            compilerOptions: {
                paths: {
                    [`${config.scope}/${config.name}`]: [`${root}/src/index.ts`]
                }
            }
        });
        const eslintTsconfig: TsConfig = {
            compilerOptions: {
                outDir: './out-tsc/eslint'
            },
            extends: `../../${BASE_TS_CONFIG_FILE_NAME}`,
            include: ['src/**/*.ts', 'vite.config.ts']
        };
        await FsUtilities.createFile(PathUtilities.resolve(root, 'tsconfig.eslint.json'), JsonUtilities.stringify(eslintTsconfig));
    }

    private async createProject(config: TsLibraryConfiguration): Promise<string> {
        LogUtilities.step('Creating the library');
        await CPUtilities.exec(
            `cd ${LIBS_DIRECTORY_NAME} && npm create vite@${this.VITE_VERSION} ${config.name} --yes -- --template vanilla-ts`
        );
        const libraryPath: string = PathUtilities.resolve(LIBS_DIRECTORY_NAME, config.name);
        await FsUtilities.createFile(PathUtilities.resolve(libraryPath, 'vite.config.ts'), [
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
        await NpmUtilities.install(config.name, [NpmPackage.VITE_PLUGIN_DTS, NpmPackage.VUE_LANGUAGE_CORE], true);
        // const originalPackageJson: PackageJson = await FsUtilities.parseFileAs(PathUtilities.resolve(libraryPath, PACKAGE_JSON_FILE_NAME));
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