import { NavElementTypes } from '../angular/nav-element-types.enum';

/**
 * Union of all ts values that should be handled custom.
 * Is used to create a record that is used in parsing/stringifying these values.
 */
export type CustomTsValues = NavElementTypes
    | 'provideZoneChangeDetection({ eventCoalescing: true })'
    | 'provideRouter(routes)'
    | 'provideClientHydration()'
    | 'provideAnimations()'
    | 'NGX_LOGGER_SERVICE'
    | 'LoggerService'
    | 'ErrorHandler'
    | 'GlobalErrorHandler'
    | 'NGX_AUTH_SERVICE'
    | 'AuthService'
    | 'NGX_JWT_INTERCEPTOR_ALLOWED_DOMAINS'
    | 'HTTP_INTERCEPTORS'
    | 'JwtInterceptor'
    | 'HttpErrorInterceptor'
    | 'JwtNotLoggedInGuard'
    | 'notFoundRoute'
    | 'true'
    | 'false'
    | 'NGX_CHANGE_SET_SERVICE'
    | 'ChangeSetService'
    // | 'undefined'
    | 'JwtLoggedInGuard'
    | 'isLoggedIn'
    | 'provideHttpClient(withInterceptorsFromDi(), withFetch())'
    | 'OfflineRequestInterceptor'
    | 'OfflineService'
    | 'NGX_PWA_OFFLINE_SERVICE';

/**
 * Maps a custom ts value to a string.
 */
export const customTsValueToString: Record<CustomTsValues, string> = {
    internalLink: 'NavElementTypes.INTERNAL_LINK',
    titleWithInternalLink: 'NavElementTypes.TITLE_WITH_INTERNAL_LINK',
    'provideZoneChangeDetection({ eventCoalescing: true })': 'provideZoneChangeDetection({ eventCoalescing: true })',
    'provideRouter(routes)': 'provideRouter(routes)',
    'provideClientHydration()': 'provideClientHydration()',
    'provideAnimations()': 'provideAnimations()',
    NGX_LOGGER_SERVICE: 'NGX_LOGGER_SERVICE',
    LoggerService: 'LoggerService',
    ErrorHandler: 'ErrorHandler',
    GlobalErrorHandler: 'GlobalErrorHandler',
    NGX_AUTH_SERVICE: 'NGX_AUTH_SERVICE',
    AuthService: 'AuthService',
    NGX_JWT_INTERCEPTOR_ALLOWED_DOMAINS: 'NGX_JWT_INTERCEPTOR_ALLOWED_DOMAINS',
    HTTP_INTERCEPTORS: 'HTTP_INTERCEPTORS',
    JwtInterceptor: 'JwtInterceptor',
    HttpErrorInterceptor: 'HttpErrorInterceptor',
    JwtNotLoggedInGuard: 'JwtNotLoggedInGuard',
    notFoundRoute: 'notFoundRoute',
    true: 'true',
    false: 'false',
    NGX_CHANGE_SET_SERVICE: 'NGX_CHANGE_SET_SERVICE',
    ChangeSetService: 'ChangeSetService',
    JwtLoggedInGuard: 'JwtLoggedInGuard',
    // undefined: 'undefined',
    isLoggedIn: 'isLoggedIn',
    'provideHttpClient(withInterceptorsFromDi(), withFetch())': 'provideHttpClient(withInterceptorsFromDi(), withFetch())',
    OfflineRequestInterceptor: 'OfflineRequestInterceptor',
    OfflineService: 'OfflineService',
    NGX_PWA_OFFLINE_SERVICE: 'NGX_PWA_OFFLINE_SERVICE'
};

/**
 * Maps a string to a custom ts value.
 */
export const customTsStringToValue: Record<string, CustomTsValues> = {
    'NavElementTypes.INTERNAL_LINK': NavElementTypes.INTERNAL_LINK,
    'NavElementTypes.TITLE_WITH_INTERNAL_LINK': NavElementTypes.TITLE_WITH_INTERNAL_LINK,
    'provideZoneChangeDetection({ eventCoalescing: true })': 'provideZoneChangeDetection({ eventCoalescing: true })',
    'provideRouter(routes)': 'provideRouter(routes)',
    'provideClientHydration()': 'provideClientHydration()',
    'provideAnimations()': 'provideAnimations()',
    NGX_LOGGER_SERVICE: 'NGX_LOGGER_SERVICE',
    LoggerService: 'LoggerService',
    ErrorHandler: 'ErrorHandler',
    GlobalErrorHandler: 'GlobalErrorHandler',
    NGX_AUTH_SERVICE: 'NGX_AUTH_SERVICE',
    AuthService: 'AuthService',
    NGX_JWT_INTERCEPTOR_ALLOWED_DOMAINS: 'NGX_JWT_INTERCEPTOR_ALLOWED_DOMAINS',
    HTTP_INTERCEPTORS: 'HTTP_INTERCEPTORS',
    JwtInterceptor: 'JwtInterceptor',
    HttpErrorInterceptor: 'HttpErrorInterceptor',
    JwtNotLoggedInGuard: 'JwtNotLoggedInGuard',
    notFoundRoute: 'notFoundRoute',
    true: 'true',
    false: 'false',
    NGX_CHANGE_SET_SERVICE: 'NGX_CHANGE_SET_SERVICE',
    ChangeSetService: 'ChangeSetService',
    JwtLoggedInGuard: 'JwtLoggedInGuard',
    // undefined: 'undefined',
    isLoggedIn: 'isLoggedIn',
    'provideHttpClient(withInterceptorsFromDi(), withFetch())': 'provideHttpClient(withInterceptorsFromDi(), withFetch())',
    OfflineRequestInterceptor: 'OfflineRequestInterceptor',
    OfflineService: 'OfflineService',
    NGX_PWA_OFFLINE_SERVICE: 'NGX_PWA_OFFLINE_SERVICE'
};