import { DockerComposeFileName, ENV_FILE_NAME, ROBOTS_FILE_NAME, SITEMAP_FILE_NAME } from '../constants';
import { FsUtilities } from '../encapsulation';
import { DefaultEnvKeys, EnvUtilities } from '../env';
import { filterAsync, getPath } from '../utilities';
import { WorkspaceProject, WorkspaceUtilities } from '../workspace';

/**
 * Utilities for working with robots.txt files.
 */
export abstract class RobotsUtilities {

    /**
     * Automatically creates robots.txt files for every project with a sitemap.xml.
     * @param fileName - The docker compose file get the variables for.
     */
    static async createRobotsTxtFiles(fileName: DockerComposeFileName): Promise<void> {
        const environmentFilePath: string = getPath(ENV_FILE_NAME);
        if (!(await FsUtilities.readFile(environmentFilePath)).includes(`${DefaultEnvKeys.IS_PUBLIC}=`)) {
            return;
        }

        // Only projects that have a sitemap file get a robots.txt file.
        const apps: WorkspaceProject[] = await filterAsync(await WorkspaceUtilities.getProjects('apps'), async a => {
            const sitemapPath: string = getPath(a.path, 'src', SITEMAP_FILE_NAME);
            return await FsUtilities.exists(sitemapPath);
        });
        await Promise.all(apps.map(async a => {
            return this.createRobotsTxtForApp(a, fileName);
        }));
    }

    /**
     * Create a robots.txt file for the provided app.
     * @param app - The app to generate the robots.txt for.
     * @param fileName - The docker compose file get the variables for.
     */
    static async createRobotsTxtForApp(
        app: WorkspaceProject,
        fileName: DockerComposeFileName
    ): Promise<void> {
        const robotsTxtPath: string = getPath(app.path, 'src', ROBOTS_FILE_NAME);
        await FsUtilities.rm(robotsTxtPath);

        const isPublic: boolean = await EnvUtilities.getEnvVariable(DefaultEnvKeys.IS_PUBLIC, fileName);

        const content: string[] = [
            'User-agent: *',
            `${isPublic ? 'Allow' : 'Disallow'}: /`
        ];

        const baseUrl: string = await EnvUtilities.getEnvVariable(DefaultEnvKeys.baseUrl(app.name), fileName);
        content.push('', `Sitemap: ${baseUrl}/${SITEMAP_FILE_NAME}`);

        await FsUtilities.createFile(robotsTxtPath, content);
    }
}