import { AddType } from '../commands/add/models/add-type.enum';
import { PACKAGE_JSON_FILE_NAME } from '../constants';
import { CPUtilities, FsUtilities, Path, PathUtilities } from '../encapsulation';
import { PackageJson } from '../npm';
import { WorkspaceConfig, WorkspaceProject, WorkspaceUtilities } from '../workspace';

/**
 * A zibri api whose image does not start: its "versions" folder does not record the version it runs as the latest.
 * Zibri writes the record when it starts in development, and only reads it in production.
 */
export type UnrecordedZibriVersion = {
    /**
     * The name of the api.
     */
    project: string,
    /**
     * The version of its package.json, which the record lacks.
     */
    version: string
};

/**
 * What zibri records of a version, in "versions/<version>.json", as far as Monux reads it.
 */
type ZibriVersionRecord = {
    /**
     * When the version stopped being the latest. Unset for the latest.
     */
    endsAt?: string
};

/**
 * The optional parts of a zibri project, as "zi new" offers them.
 */
export type ZibriFeature = 'pages' | 'docs' | 'mailingList' | 'metricsDashboard' | 'logEmail';

/**
 * The features that need the "pages" feature.
 */
export const ZIBRI_FEATURES_NEEDING_PAGES: ZibriFeature[] = ['docs', 'mailingList', 'metricsDashboard'];

/**
 * Utilities for zibri specific code generation/manipulation.
 */
export abstract class ZibriUtilities {

    // the zibri a workspace is generated with is the one the tests of Monux generated. The templates in templates/zibri
    // edit what its "zi new" writes, so a new version needs the add-zibri and add-angular tests to pass first
    private static readonly CLI_VERSION: string = '3.2.0';

    /**
     * Finds the zibri apis of the workspace whose image does not start, as their "versions" folder does not record the
     * version of their package.json as the latest.
     * @param rootDir - The directory of the workspace.
     * @returns The apis, with the version their record lacks.
     */
    static async findUnrecordedVersions(rootDir: string): Promise<UnrecordedZibriVersion[]> {
        const res: UnrecordedZibriVersion[] = [];
        const apps: WorkspaceProject[] = await WorkspaceUtilities.getProjects('apps', rootDir);
        for (const app of apps) {
            if (await WorkspaceUtilities.findProjectType(app.name, rootDir) !== AddType.ZIBRI) {
                continue;
            }
            const { version = '' } = await FsUtilities.parseFileAs<PackageJson>(PathUtilities.resolve(app.path, PACKAGE_JSON_FILE_NAME));
            const recordPath: Path = PathUtilities.resolve(app.path, 'versions', `${version}.json`);
            const record: ZibriVersionRecord | undefined = await FsUtilities.exists(recordPath)
                ? await FsUtilities.parseFileAs<ZibriVersionRecord>(recordPath)
                : undefined;
            if (record == undefined || record.endsAt != undefined) {
                res.push({ project: app.name, version });
            }
        }
        return res;
    }

    /**
     * Creates a zibri project inside the given directory, without asking anything.
     * Monux sets up its own workflows, and every endpoint of the api needs a login unless it says otherwise.
     * @param directory - The directory to create the project in.
     * @param name - The name of the project.
     * @param features - The optional parts of zibri the project gets.
     */
    static async createProject(directory: Path, name: string, features: ZibriFeature[]): Promise<void> {
        const featureArgument: string = features.length ? features.join(',') : 'none';
        await CPUtilities.exec(`cd ${directory} && npx --yes zibri-cli@${this.CLI_VERSION} new ${name} none isLoggedIn ${featureArgument}`);
    }

    /**
     * Gets the name of the contract library of an api: what the api and its apps agree on, in the libs folder.
     * @param apiName - The name of the api.
     * @returns The name of the library, such as "api-contract".
     */
    static getContractName(apiName: string): string {
        return `${apiName}-contract`;
    }

    /**
     * Resolves the package name of the contract library of an api, which the api and its apps import it by.
     * @param apiName - The name of the api.
     * @returns The package name, such as "@shop/api-contract".
     */
    static async resolveContractPackage(apiName: string): Promise<string> {
        const workspace: WorkspaceConfig = await WorkspaceUtilities.getConfigOrFail();
        return `@${workspace.name}/${this.getContractName(apiName)}`;
    }
}