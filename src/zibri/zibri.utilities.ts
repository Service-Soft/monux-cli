import { CPUtilities, Path } from '../encapsulation';
import { WorkspaceConfig, WorkspaceUtilities } from '../workspace';

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