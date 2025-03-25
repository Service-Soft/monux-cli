import { Dirent } from 'fs';

import { DockerComposeFileName, ENV_FILE_NAME, ROBOTS_FILE_NAME, SITEMAP_FILE_NAME } from '../constants';
import { FsUtilities } from '../encapsulation';
import { DefaultEnvKeys, EnvUtilities } from '../env';
import { filterAsync, getPath } from '../utilities';
import { WorkspaceUtilities } from '../workspace';

/**
 * Utilities for working with robots.txt files.
 */
export abstract class RobotsUtilities {

    /**
     * Automatically creates robots.txt files for every project with a sitemap.xml.
     * @param fileName - The docker compose file get the variables for.
     * @param rootPath - The root of the monorepo.
     */
    static async createRobotsTxtFiles(fileName: DockerComposeFileName, rootPath: string = ''): Promise<void> {
        const environmentFilePath: string = getPath(rootPath, ENV_FILE_NAME);
        if (!(await FsUtilities.readFile(environmentFilePath)).includes(`${DefaultEnvKeys.IS_PUBLIC}=`)) {
            return;
        }

        // Only projects that have a sitemap file get a robots.txt file.
        const apps: Dirent[] = await filterAsync(await WorkspaceUtilities.getProjects('apps'), async a => {
            const sitemapPath: string = getPath(a.parentPath, a.name, 'src', SITEMAP_FILE_NAME);
            return await FsUtilities.exists(sitemapPath);
        });
        await Promise.all(apps.map(async a => {
            return this.createRobotsTxtForApp(a, fileName, rootPath);
        }));
    }

    /**
     * Create a robots.txt file for the provided app.
     * @param app - The app to generate the robots.txt for.
     * @param fileName - The docker compose file get the variables for.
     * @param rootPath - The path of the monorepo.
     */
    static async createRobotsTxtForApp(
        app: Dirent,
        fileName: DockerComposeFileName,
        rootPath: string = ''
    ): Promise<void> {
        const robotsTxtPath: string = getPath(app.parentPath, app.name, 'src', ROBOTS_FILE_NAME);
        await FsUtilities.rm(robotsTxtPath);

        const isPublic: boolean = await EnvUtilities.getEnvVariable(DefaultEnvKeys.IS_PUBLIC, rootPath, fileName);

        const content: string[] = [
            'User-agent: *',
            `${isPublic ? 'Allow' : 'Disallow'}: /`
        ];

        const baseUrl: string = await EnvUtilities.getEnvVariable(DefaultEnvKeys.baseUrl(app.name), rootPath, fileName);
        content.push('', `${baseUrl}/${SITEMAP_FILE_NAME}`);

        await FsUtilities.createFile(robotsTxtPath, content);
    }
}