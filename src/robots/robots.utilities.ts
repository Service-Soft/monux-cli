import { ROBOTS_FILE_NAME, SITEMAP_FILE_NAME } from '../constants';
import { DockerComposeFileName } from '../docker';
import { FsUtilities } from '../encapsulation';
import { DefaultEnvKeys, EnvUtilities, EnvValue } from '../env';
import { filterAsync, getPath, Path } from '../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../workspace';

/**
 * Utilities for working with robots.txt files.
 */
export abstract class RobotsUtilities {

    /**
     * Automatically creates robots.txt files for every project with a sitemap.xml.
     * @param fileName - The docker compose file get the variables for.
     * @param rootDir - The directory of the Monux monorepo where the files should be created.
     */
    static async createRobotsTxtFiles(fileName: DockerComposeFileName, rootDir: string): Promise<void> {
        // Only projects that have a sitemap file get a robots.txt file.
        const apps: WorkspaceProject[] = await filterAsync(await WorkspaceUtilities.getProjects('apps', rootDir), async a => {
            const sitemapPath: Path = getPath(a.path, 'src', SITEMAP_FILE_NAME);
            return await FsUtilities.exists(sitemapPath);
        });
        await Promise.all(apps.map(async a => {
            return this.createRobotsTxtForApp(a, fileName, undefined, rootDir);
        }));
    }

    /**
     * Create a robots.txt file for the provided app.
     * @param app - The app to generate the robots.txt for.
     * @param fileName - The docker compose file get the variables for.
     * @param domain - An optional domain. This is used when creating new projects, where the domain environment variable has not been set yet.
     * @param rootDir - The directory of the Monux monorepo.
     */
    static async createRobotsTxtForApp(
        app: WorkspaceProject,
        fileName: DockerComposeFileName,
        domain: string | undefined,
        rootDir: string
    ): Promise<void> {
        const robotsTxtPath: Path = getPath(app.path, 'src', ROBOTS_FILE_NAME);
        await FsUtilities.rm(robotsTxtPath);

        const env: EnvValue = await EnvUtilities.getEnvVariable(DefaultEnvKeys.ENV, fileName, rootDir);

        const content: string[] = [
            'User-agent: *',
            `${env === EnvValue.PROD ? 'Allow' : 'Disallow'}: /`
        ];

        const baseUrl: string = domain ? `https://${domain}` : await EnvUtilities.getEnvVariable(DefaultEnvKeys.baseUrl(app.name), fileName, rootDir);
        content.push('', `Sitemap: ${baseUrl}/${SITEMAP_FILE_NAME}`);

        await FsUtilities.createFile(robotsTxtPath, content);
    }
}