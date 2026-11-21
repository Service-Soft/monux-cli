import { beforeEach, describe, expect, test } from '@jest/globals';

import { getMockConstants, MockConstants } from '../__testing__';
import { FsUtilities, PathUtilities, Path } from '../encapsulation';
import { TemplateUtilities } from './template.utilities';

const mockConstants: MockConstants = getMockConstants('template-utilities');

describe('TemplateUtilities', () => {
    const templatesDirectory: Path = PathUtilities.resolve(mockConstants.PROJECT_DIR, 'templates');
    const destination: Path = PathUtilities.resolve(mockConstants.PROJECT_DIR, 'apps', 'admin');
    // the start of a png, which holds NUL bytes like every image.
    const image: Buffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);

    beforeEach(async () => {
        await FsUtilities.rm(mockConstants.PROJECT_DIR);
        TemplateUtilities['root'] = templatesDirectory;
        const template: Path = PathUtilities.resolve(templatesDirectory, 'angular-app');
        await FsUtilities.createFile(
            PathUtilities.resolve(template, 'src', 'app', 'app.html'),
            '<h1>{{ title() }}</h1>\n<p>{{=name}} on {{=domain}}</p>'
        );
        await FsUtilities.createFile(PathUtilities.resolve(template, 'src', 'environment', '{{=name}}.ts'), 'export const name = \'{{=name}}\';');
        await FsUtilities.writeFileBytes(PathUtilities.resolve(template, 'public', 'logo.png'), image);
    });

    test('write fills the placeholders in contents and paths, and copies images as they are', async () => {
        await FsUtilities.createFile(PathUtilities.resolve(destination, 'src', 'app', 'app.html'), '<router-outlet />');

        await TemplateUtilities.write('angular-app', destination, { name: 'admin', domain: 'admin.example.com' });

        expect(await FsUtilities.readFile(PathUtilities.resolve(destination, 'src', 'app', 'app.html')))
            .toEqual('<h1>{{ title() }}</h1>\n<p>admin on admin.example.com</p>');
        expect(await FsUtilities.readFile(PathUtilities.resolve(destination, 'src', 'environment', 'admin.ts')))
            .toEqual('export const name = \'admin\';');
        expect(await FsUtilities.readFileBytes(PathUtilities.resolve(destination, 'public', 'logo.png'))).toEqual(image);
    });

    test('write fails without writing anything when a placeholder is missing', async () => {
        await expect(TemplateUtilities.write('angular-app', destination, { name: 'admin' }))
            .rejects.toThrow('The template "angular-app" uses the placeholder "domain", which was not given');
        expect(await FsUtilities.exists(destination)).toBe(false);
    });

    test('write fails when a placeholder is not used by the template', async () => {
        await expect(TemplateUtilities.write('angular-app', destination, { name: 'admin', domain: 'admin.example.com', port: '4200' }))
            .rejects.toThrow('The template "angular-app" does not use the placeholders port');
    });

    test('write keeps the sections that are on, and leaves out a file that is empty without its sections', async () => {
        const template: Path = PathUtilities.resolve(templatesDirectory, 'angular-website');
        await FsUtilities.createFile(PathUtilities.resolve(template, 'styles.css'), [
            '@import "tailwindcss";',
            '{{#tracking}}',
            '@import "@service-soft/ngx-tracking";',
            '{{/tracking}}',
            '{{^tracking}}',
            '/* no tracking */',
            '{{/tracking}}'
        ]);
        await FsUtilities.createFile(PathUtilities.resolve(template, 'tracking.provider.ts'), ['{{#tracking}}', 'export const tracking = true;', '{{/tracking}}']);

        await TemplateUtilities.write('angular-website', destination, {}, { tracking: false });

        expect(await FsUtilities.readFile(PathUtilities.resolve(destination, 'styles.css'))).toEqual('@import "tailwindcss";\n/* no tracking */');
        expect(await FsUtilities.exists(PathUtilities.resolve(destination, 'tracking.provider.ts'))).toBe(false);

        await TemplateUtilities.write('angular-website', destination, {}, { tracking: true });
        expect(await FsUtilities.readFile(PathUtilities.resolve(destination, 'styles.css')))
            .toEqual('@import "tailwindcss";\n@import "@service-soft/ngx-tracking";');
        expect(await FsUtilities.readFile(PathUtilities.resolve(destination, 'tracking.provider.ts'))).toEqual('export const tracking = true;');
    });

    test('write fails for a section that is not given, or not used', async () => {
        const template: Path = PathUtilities.resolve(templatesDirectory, 'angular-website');
        await FsUtilities.createFile(PathUtilities.resolve(template, 'styles.css'), ['{{#tracking}}', 'a', '{{/tracking}}']);

        await expect(TemplateUtilities.write('angular-website', destination, {}))
            .rejects.toThrow('The template "angular-website" uses the section "tracking", which was not given');
        await expect(TemplateUtilities.write('angular-website', destination, {}, { tracking: true, pwa: false }))
            .rejects.toThrow('The template "angular-website" does not have the sections pwa');
    });

    test('write fails for a template that does not exist', async () => {
        await expect(TemplateUtilities.write('angular-ap', destination, {})).rejects.toThrow('The template "angular-ap" does not exist');
    });
});