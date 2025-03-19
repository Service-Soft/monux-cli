import { Dirent } from 'fs';

import { ENV_FILE_NAME, IS_PUBLIC_ENVIRONMENT_VARIABLE, ROBOTS_FILE_NAME, SITEMAP_FILE_NAME } from '../constants';
import { FsUtilities } from '../encapsulation';
import { EnvUtilities } from '../env';
import { filterAsync, getPath, toSnakeCase } from '../utilities';
import { WorkspaceUtilities } from '../workspace';

/**
 * Utilities for working with robots.txt files.
 */
export abstract class RobotsUtilities {

    /**
     * Automatically creates robots.txt files for every project with a sitemap.xml.
     * @param rootPath - The root of the monorepo.
     */
    static async createRobotsTxtFiles(rootPath: string = ''): Promise<void> {
        const environmentFilePath: string = getPath(rootPath, ENV_FILE_NAME);
        if (!(await FsUtilities.readFile(environmentFilePath)).includes(`${IS_PUBLIC_ENVIRONMENT_VARIABLE}=`)) {
            return;
        }

        // Only projects that have a sitemap file get a robots.txt file.
        const apps: Dirent[] = await filterAsync(await WorkspaceUtilities.getProjects('apps'), async a => {
            const sitemapPath: string = getPath(a.parentPath, a.name, 'src', SITEMAP_FILE_NAME);
            return await FsUtilities.exists(sitemapPath);
        });
        await Promise.all(apps.map(async a => {
            const domain: string = await EnvUtilities.getEnvVariable(`${toSnakeCase(a.name)}_domain`, rootPath);
            return this.createRobotsTxtForApp(a, domain, false, rootPath);
        }));
    }

    /**
     * Create a robots.txt file for the provided app.
     * @param app - The app to generate the robots.txt for.
     * @param domain - The domain of the app.
     * @param shouldCreateEnvVariable - Whether or not the is_public environment variable should be generated as well.
     * @param rootPath - The path of the monorepo.
     */
    static async createRobotsTxtForApp(
        app: Dirent,
        domain: string,
        shouldCreateEnvVariable: boolean,
        rootPath: string = ''
    ): Promise<void> {
        const robotsTxtPath: string = getPath(app.parentPath, app.name, 'src', ROBOTS_FILE_NAME);
        await FsUtilities.rm(robotsTxtPath);

        if (shouldCreateEnvVariable) {
            await this.createIsPublicEnvVariableIfNotExists(rootPath);
        }

        const isPublic: boolean = await EnvUtilities.getEnvVariable('is_public', rootPath);
        const webSecure: 'web' | 'websecure' = await EnvUtilities.getEnvVariable('web_secure', rootPath);

        const content: string[] = [
            'User-agent: *',
            `${isPublic ? 'Allow' : 'Disallow'}: /`
        ];

        if (domain) {
            content.push('', `Sitemap: ${webSecure === 'websecure' ? 'https' : 'http'}://${domain}/${SITEMAP_FILE_NAME}`);
        }

        await FsUtilities.createFile(robotsTxtPath, content);
    }

    private static async createIsPublicEnvVariableIfNotExists(rootPath: string): Promise<void> {
        const environmentFilePath: string = getPath(rootPath, ENV_FILE_NAME);
        if ((await FsUtilities.readFile(environmentFilePath)).includes(`${IS_PUBLIC_ENVIRONMENT_VARIABLE}=`)) {
            return;
        }
        await EnvUtilities.addVariable({
            key: IS_PUBLIC_ENVIRONMENT_VARIABLE,
            required: true,
            type: 'string',
            value: false
        });
    }
}