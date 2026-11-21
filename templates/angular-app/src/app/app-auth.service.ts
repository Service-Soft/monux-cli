import { Service } from '@angular/core';
import { AuthService } from '@service-soft/ngx-auth/auth';
import { Permission, PlatformPermission } from '{{=contractPackage}}';

/**
 * The login of the app at its api, and what the logged in user may do there, by the permissions the contract library
 * of the api names. Roles are data the administrators of the api create, so they are any name.
 */
@Service()
export class AppAuthService extends AuthService<string, Permission, PlatformPermission> {}
