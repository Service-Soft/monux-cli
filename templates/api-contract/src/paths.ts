/**
 * The routes of {{=apiName}}, below its base url, which its controllers serve and its apps call.
 */
export enum ApiRoute {
    AUTH = 'auth',
    USERS = 'users',
    TENANTS = 'tenants',
    INVITATIONS = 'invitations',
    ROLES = 'roles',
    LOGS = 'logs'
}

/**
 * The pages of an app that the api links to, like in its mails, below the base url of the app. The api adds the token
 * of the link to each as the last segment.
 */
export enum AppPage {
    CONFIRM_PASSWORD_RESET = 'confirm-password-reset',
    ACCEPT_INVITATION = 'accept-invitation'
}
