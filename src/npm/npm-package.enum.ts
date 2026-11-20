/**
 * All known npm packages.
 */
export enum NpmPackage {
    TAILWIND = 'tailwindcss@^4.3.3',
    // runs tailwind in the webpack of storybook
    TAILWIND_POSTCSS = '@tailwindcss/postcss@^4.3.5',
    // the @service-soft libraries share the major of the Angular they are built for
    SERVICE_SOFT_UI = '@service-soft/ui@^22.2.0',
    SERVICE_SOFT_NGX_NAVIGATION = '@service-soft/ngx-navigation@^22.2.0',
    SERVICE_SOFT_NGX_TRACKING = '@service-soft/ngx-tracking@^22.2.0',
    SERVICE_SOFT_NGX_AUTH = '@service-soft/ngx-auth@^22.2.0',
    SERVICE_SOFT_NGX_PWA = '@service-soft/ngx-pwa@^22.2.0',
    SERVICE_SOFT_NGX_ERROR_HANDLING = '@service-soft/ngx-error-handling@^22.2.0',
    SERVICE_SOFT_NGX_PERSISTENCE_LOGGER = '@service-soft/ngx-persistence-logger@^22.2.0',
    SERVICE_SOFT_NGX_ENTITY = '@service-soft/ngx-entity@^22.2.0',
    // what the table, the select and the autocomplete of @service-soft/ui are built on, an optional peer of it
    ANGULAR_ARIA = '@angular/aria@^22.3.0',
    // what the Angular framework of storybook builds with, a peer of it
    ANGULAR_DEVKIT_BUILD_ANGULAR = '@angular-devkit/build-angular@^22.3.0',
    ANGULAR_PLATFORM_BROWSER_DYNAMIC = '@angular/platform-browser-dynamic@^22.3.0',
    // the stories of an Angular library, with the accessibility panel of AXE
    STORYBOOK = 'storybook@^10.6.7',
    STORYBOOK_ANGULAR = '@storybook/angular@^10.6.7',
    STORYBOOK_ADDON_A11Y = '@storybook/addon-a11y@^10.6.7',
    // the browser the AXE checks of the stories of an Angular library run in
    PLAYWRIGHT = 'playwright@^1.65.1',
    AXE_CORE_PLAYWRIGHT = '@axe-core/playwright@^4.14.0',
    // the types of node, which the storybook config of an Angular library runs in
    TYPES_NODE = '@types/node@^24.19.2',
    // the models the routes of zibri answer and take, which the @service-soft libraries read them as
    ZIBRI_CONTRACT = 'zibri-contract@^3.2.0',
    // draws the qr code a user scans with an authenticator app, for ngx-auth
    UQR = 'uqr@^0.1.3',
    FONTAWESOME_SOLID_ICONS = '@fortawesome/free-solid-svg-icons@^7.3.1',
    TAILWIND_CLI = '@tailwindcss/cli@^4.3.3',
    // cuts the fonts of a website down to the characters it shows
    SUBSET_FONT = 'subset-font@^2.4.0',
    ESLINT_PLUGIN_BETTER_TAILWINDCSS = 'eslint-plugin-better-tailwindcss@^4.9.1',
    NGX_PERSISTENCE_LOGGER = 'ngx-persistence-logger',
    NGX_MATERIAL_AUTH = 'ngx-material-auth',
    NGX_MATERIAL_CHANGE_SETS = 'ngx-material-change-sets',
    NGX_MATERIAL_TRACKING = 'ngx-material-tracking',
    NGX_MATERIAL_NAVIGATION = 'ngx-material-navigation',
    NGX_MATERIAL_ENTITY = 'ngx-material-entity',
    NGX_PWA = 'ngx-pwa',
    TYPESCRIPT = 'typescript',
    SERVICE_SOFT_ESLINT_CONFIG = '@service-soft/eslint-config',
    ESLINT = 'eslint',
    POSTCSS = 'postcss@^8.5.33',
    LBX_JWT = 'lbx-jwt',
    LBX_CHANGE_SETS = 'lbx-change-sets',
    LBX_PERSISTENCE_LOGGER = 'lbx-persistence-logger',
    LOOPBACK_AUTHENTICATION = '@loopback/authentication',
    LOOPBACK_AUTHORIZATION = '@loopback/authorization',
    LOOPBACK_CRON = '@loopback/cron',
    LOOPBACK_CONNECTOR_POSTGRES = 'loopback-connector-postgresql',
    NODEMAILER_TYPES = '@types/nodemailer',
    LODASH = 'lodash',
    LODASH_TYPES = '@types/lodash',
    TSC_WATCH = 'tsc-watch',
    // builds an Angular library, like the @service-soft libraries
    NG_PACKAGR = 'ng-packagr@^22.2.6',
    TSLIB = 'tslib',
    LOOPBACK_4_MIGRATION = 'loopback4-migration',
    CLASS_VALIDATOR = 'class-validator',
    CLASS_TRANSFORMER = 'class-transformer',
    NEST_JS_SWAGGER = '@nestjs/swagger',
    NEST_JS_TYPEORM = '@nestjs/typeorm',
    TYPEORM = 'typeorm',
    PG = 'pg',
    MYSQL_2 = 'mysql2',
    // TODO: clean up after loopback4 bundling
    WEBPACK = 'webpack',
    WEBPACK_CLI = 'webpack-cli',
    TS_LOADER = 'ts-loader',
    WEBPACK_NODE_EXTERNALS = 'webpack-node-externals',
    TSCONFIG_PATH_WEBPACK_PLUGIN = 'tsconfig-paths-webpack-plugin',
    FORK_TS_CHECKER_WEBPACK_PLUGIN = 'fork-ts-checker-webpack-plugin',
    CLDRJS = 'cldrjs',
    CLDR_DATA = 'cldr-data',
    VITE = 'vite',
    VITE_TS_CONFIG_PATHS = 'vite-tsconfig-paths'
}