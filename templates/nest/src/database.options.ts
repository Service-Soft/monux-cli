import { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { environment } from './environment/environment';

// the database of the workspace, a service of its docker compose files. Its values come from the environment of the
// workspace, which "mx prepare" writes. The entities of every module are found by TypeOrmModule.forFeature
export const DATABASE_OPTIONS: TypeOrmModuleOptions = {
    type: '{{=dbType}}',
    host: environment.{{=dbHostKey}},
    port: {{=dbPort}},
    username: environment.{{=dbUserKey}},
    password: environment.{{=dbPasswordKey}},
    database: environment.{{=dbNameKey}},
    autoLoadEntities: true,
    // the schema follows the entities while developing. Switch to migrations before the database holds data anyone
    // would miss, see https://docs.nestjs.com/techniques/database#migrations
    synchronize: environment.env === 'dev'
};
