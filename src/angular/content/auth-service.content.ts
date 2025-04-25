/* eslint-disable stylistic/max-len */
// eslint-disable-next-line jsdoc/require-jsdoc
export const authServiceContent: string
= `import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, NgZone, PLATFORM_ID } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { BaseAuthData, BaseRole, BaseToken, JwtAuthService } from 'ngx-material-auth';

import { environment } from '../../environment/environment';
import { Roles } from '../models/roles.enum';

/**
 * Provides information about a user role.
 */
export type Role = BaseRole<Roles>; // TODO: Provide Roles enum

/**
 * The structure of a jwt.
 */
export type Token = BaseToken;

/**
 * The data that is stored about a user.
 */
export type AuthData = BaseAuthData<Token, Roles, Role>;

/**
 * Handles authentication and authorization of users.
 */
@Injectable({ providedIn: 'root' })
export class AuthService extends JwtAuthService<AuthData, Roles, Role, Token> {
    override readonly API_TURN_ON_TWO_FACTOR_URL: string = \`\${environment.api_base_url}/2fa/turn-on\`;
    override readonly API_CONFIRM_TURN_ON_TWO_FACTOR_URL: string = \`\${environment.api_base_url}/2fa/confirm-turn-on\`;
    override readonly API_TURN_OFF_TWO_FACTOR_URL: string = \`\${environment.api_base_url}/2fa/turn-off\`;
    override readonly API_LOGIN_URL: string = \`\${environment.api_base_url}/login\`;
    override readonly API_LOGOUT_URL: string = \`\${environment.api_base_url}/logout\`;
    override readonly API_REFRESH_TOKEN_URL: string = \`\${environment.api_base_url}/refresh-token\`;
    override readonly API_REQUEST_RESET_PASSWORD_URL: string = \`\${environment.api_base_url}/request-reset-password\`;
    override readonly API_CONFIRM_RESET_PASSWORD_URL: string = \`\${environment.api_base_url}/confirm-reset-password\`;
    override readonly API_VERIFY_RESET_PASSWORD_TOKEN_URL: string = \`\${environment.api_base_url}/verify-password-reset-token\`;
    override readonly API_REGISTER_BIOMETRIC_CREDENTIAL: string = \`\${environment.api_base_url}/biometric/register\`;
    override readonly API_CONFIRM_REGISTER_BIOMETRIC_CREDENTIAL: string = \`\${environment.api_base_url}/biometric/confirm-register\`;
    // eslint-disable-next-line stylistic/max-len
    override readonly API_GENERATE_BIOMETRIC_AUTHENTICATION_OPTIONS: string = \`\${environment.api_base_url}/biometric/authentication-options\`;
    override readonly API_CANCEL_REGISTER_BIOMETRIC_CREDENTIAL: string = \`\${environment.api_base_url}/biometric/cancel-register\`;

    constructor(
        http: HttpClient,
        snackbar: MatSnackBar,
        zone: NgZone,
        router: Router,
        dialog: MatDialog,
        @Inject(PLATFORM_ID)
        platformId: Object
    ) {
        super(http, snackbar, zone, router, dialog, platformId);
    }
}`;