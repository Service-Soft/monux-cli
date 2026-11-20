import { Permissions, PlatformPermissions } from '{{=contractPackage}}';
import { PermissionDeclaration } from 'zibri';

// every permission of the application: what routes may ask for, and what roles may carry. A tenant permission is held
// through a membership, a platform permission by the user. Declared in the contract library, where the apps read them
// too, with zibri's own spread in. See the permissions docs
export { Permissions, PlatformPermissions };

export const permissions: PermissionDeclaration = {
    permissions: Object.values(Permissions),
    platformPermissions: Object.values(PlatformPermissions)
};
