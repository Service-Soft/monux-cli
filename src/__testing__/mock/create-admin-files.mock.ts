import { FsUtilities, Path, PathUtilities } from '../../encapsulation';
import { adminControllerContent } from '../../loopback/admin-controller.content';
import { adminModelContent } from '../../loopback/admin-model.content';
import { fullAdminModelContent } from '../../loopback/full-admin-model.content';
import { newAdminModelContent } from '../../loopback/new-admin-model.content';

// eslint-disable-next-line jsdoc/require-jsdoc
export async function createAdminFilesMock(root: string, dbName: string): Promise<void> {
    const adminModelTs: Path = PathUtilities.resolve(root, 'src', 'models', 'admin.model.ts');
    await FsUtilities.createFile(adminModelTs, adminModelContent);
    await FsUtilities.createFile(
        PathUtilities.resolve(root, 'src', 'models', 'roles.enum.ts'),
        [
            'export enum Roles {',
            '\tADMIN = \'ADMIN\'',
            '}'
        ]
    );
    await FsUtilities.createFile(
        PathUtilities.resolve(root, 'src', 'models', 'index.ts'),
        [
            'export * from \'./admin.model\';',
            'export * from \'./roles.enum\';'
        ]
    );

    const adminRepositoryTs: Path = PathUtilities.resolve(root, 'src', 'repositories', 'admin.repository.ts');
    await FsUtilities.createFile(adminRepositoryTs, []);

    const controllerPath: string = PathUtilities.resolve(root, 'src', 'controllers');
    await FsUtilities.createFile(PathUtilities.resolve(controllerPath, 'admin', 'admin.controller.ts'), adminControllerContent(dbName));
    await FsUtilities.updateFile(PathUtilities.resolve(controllerPath, 'index.ts'), 'export * from \'./admin/admin.controller\';', 'append');

    await FsUtilities.createFile(PathUtilities.resolve(controllerPath, 'admin', 'new-admin.model.ts'), newAdminModelContent);
    await FsUtilities.createFile(PathUtilities.resolve(controllerPath, 'admin', 'full-admin.model.ts'), fullAdminModelContent);
}