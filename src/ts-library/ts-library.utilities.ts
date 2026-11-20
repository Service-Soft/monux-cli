import { DOCKER_FILE_NAME, LIBS_DIRECTORY_NAME, PACKAGE_JSON_FILE_NAME } from '../constants';
import { FsUtilities, LogUtilities, Path, PathUtilities } from '../encapsulation';
import { EslintUtilities } from '../eslint';
import { NpmPackage, NpmUtilities, PackageJson } from '../npm';
import { TemplateUtilities } from '../templates';
import { WorkspaceProject, WorkspaceUtilities } from '../workspace';

// the lines of the Dockerfile of each template of Monux, which the libraries of a project are added above
const DOCKERFILE_MANIFESTS_MARKER: string = '# mx adds the manifests of the libraries this project uses above this line';
const DOCKERFILE_SOURCES_MARKER: string = '# mx adds the libraries this project uses above this line';

// the scripts of a project that read the build of a library it uses: its code, or its types
const SCRIPTS_USING_LIBRARIES: string[] = ['build', 'start', 'test', 'lint'];

/**
 * Creates the Typescript libraries of a workspace and adds them to the projects that use them.
 */
export abstract class TsLibraryUtilities {

    /**
     * Creates a library in the libs folder, built to CommonJS for node and to ES modules for the browser.
     * @param name - The name of its folder, such as "api-contract".
     * @param packageName - The name of its package, which projects import it by, such as "@shop/api-contract".
     * @returns The library.
     */
    static async create(name: string, packageName: string): Promise<WorkspaceProject> {
        LogUtilities.step(`Creating the library "${packageName}"`);
        const root: Path = PathUtilities.resolve(LIBS_DIRECTORY_NAME, name);
        await TemplateUtilities.write('ts-library', root, { packageName });
        await NpmUtilities.install(name, [NpmPackage.TYPESCRIPT], true);
        await EslintUtilities.setupProjectEslint(root, false);
        return await WorkspaceUtilities.findProjectOrFail(name, PathUtilities.resolve('.'));
    }

    /**
     * Adds a library to a project: as a dependency, built before every script of the project that reads it, and copied
     * and built in its Docker image. A change of the library therefore reaches the project without a step to remember,
     * and the "start" of the library rebuilds it on every change.
     * @param library - The library.
     * @param projectName - The name of the project that uses it.
     */
    static async install(library: WorkspaceProject, projectName: string): Promise<void> {
        await NpmUtilities.installFromWorkspace(projectName, await NpmUtilities.resolvePackageName(library));

        const project: WorkspaceProject = await WorkspaceUtilities.findProjectOrFail(projectName, PathUtilities.resolve('.'));
        await this.addBuildHooks(project, library);
        await this.addToDockerfile(project, library);
    }

    private static async addBuildHooks(project: WorkspaceProject, library: WorkspaceProject): Promise<void> {
        const scripts: Record<string, string | undefined> = (
            await FsUtilities.parseFileAs<PackageJson>(PathUtilities.resolve(project.path, PACKAGE_JSON_FILE_NAME))
        ).scripts;
        // by the name of its package: a script runs inside the folder of its project, where npm reads a path as one below it
        const buildLibrary: string = `npm run build --workspace=${await NpmUtilities.resolvePackageName(library)}`;
        const hooks: Record<string, string> = {};
        for (const script of SCRIPTS_USING_LIBRARIES.filter(s => scripts[s] != undefined)) {
            const hook: string | undefined = scripts[`pre${script}`];
            if (hook?.includes(buildLibrary) === true) {
                continue;
            }
            hooks[`pre${script}`] = hook == undefined ? buildLibrary : `${hook} && ${buildLibrary}`;
        }
        await NpmUtilities.updatePackageJson(project.name, { scripts: hooks });
    }

    private static async addToDockerfile(project: WorkspaceProject, library: WorkspaceProject): Promise<void> {
        const dockerfilePath: Path = PathUtilities.resolve(project.path, DOCKER_FILE_NAME);
        if (!await FsUtilities.exists(dockerfilePath)) {
            return;
        }
        const dockerfile: string = await FsUtilities.readFile(dockerfilePath);
        if (!dockerfile.includes(DOCKERFILE_SOURCES_MARKER)) {
            LogUtilities.warning(`Add ${library.npmWorkspaceString} to the Dockerfile of "${project.name}", so that its image builds it`);
            return;
        }
        const libraryPath: string = library.npmWorkspaceString;
        const manifest: string = `COPY ${libraryPath}/package.json ${libraryPath}/package.json`;
        await FsUtilities.updateFile(
            dockerfilePath,
            dockerfile
                .replace(DOCKERFILE_MANIFESTS_MARKER, `${manifest}\n${DOCKERFILE_MANIFESTS_MARKER}`)
                // the dependencies of the library too, like the compiler that builds it
                .replace(/(RUN npm ci --workspace [^\n]*)/, `$1 --workspace ${libraryPath}`)
                .replace(DOCKERFILE_SOURCES_MARKER, `COPY ${libraryPath} ${libraryPath}\n${DOCKERFILE_SOURCES_MARKER}`),
            'replace'
        );
    }
}