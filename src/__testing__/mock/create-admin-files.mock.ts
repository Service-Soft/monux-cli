import { FsUtilities } from '../../encapsulation';
import { adminControllerContent } from '../../loopback/admin-controller.content';
import { adminModelContent } from '../../loopback/admin-model.content';
import { fullAdminModelContent } from '../../loopback/full-admin-model.content';
import { newAdminModelContent } from '../../loopback/new-admin-model.content';
import { Path, getPath } from '../../utilities';

// eslint-disable-next-line jsdoc/require-jsdoc
export async function createAdminFilesMock(root: string, dbName: string): Promise<void> {
    const adminModelTs: Path = getPath(root, 'src', 'models', 'admin.model.ts');
    await FsUtilities.createFile(adminModelTs, adminModelContent);
    await FsUtilities.createFile(
        getPath(root, 'src', 'models', 'roles.enum.ts'),
        [
            'export enum Roles {',
            '\tADMIN = \'ADMIN\'',
            '}'
        ]
    );
    await FsUtilities.createFile(
        getPath(root, 'src', 'models', 'index.ts'),
        [
            'export * from \'./admin.model\';',
            'export * from \'./roles.enum\';'
        ]
    );

    const adminRepositoryTs: Path = getPath(root, 'src', 'repositories', 'admin.repository.ts');
    await FsUtilities.createFile(adminRepositoryTs, []);

    const controllerPath: string = getPath(root, 'src', 'controllers');
    await FsUtilities.createFile(getPath(controllerPath, 'admin', 'admin.controller.ts'), adminControllerContent(dbName));
    await FsUtilities.updateFile(getPath(controllerPath, 'index.ts'), 'export * from \'./admin/admin.controller\';', 'append');

    await FsUtilities.createFile(getPath(controllerPath, 'admin', 'new-admin.model.ts'), newAdminModelContent);
    await FsUtilities.createFile(getPath(controllerPath, 'admin', 'full-admin.model.ts'), fullAdminModelContent);
}