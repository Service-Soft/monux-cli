import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler, Options} from '@loopback/repository';

import {environment} from '../environment/environment';

// the database of the workspace, a service of its docker compose files. Its values come from the environment of the
// workspace, which "mx prepare" writes. It connects on its first query, so the api starts before the database does
const config: Options = {
  name: 'db',
  connector: 'postgresql',
  host: environment.{{=dbHostKey}},
  port: 5432,
  user: environment.{{=dbUserKey}},
  password: environment.{{=dbPasswordKey}},
  database: environment.{{=dbNameKey}},
  lazyConnect: true,
};

// Observe application's life cycle to disconnect the datasource when
// application is stopped. This allows the application to be shut down
// gracefully. The `stop()` method is inherited from `juggler.DataSource`.
// Learn more at https://loopback.io/doc/en/lb4/Life-cycle.html
@lifeCycleObserver('datasource')
export class DbDataSource
  extends juggler.DataSource
  implements LifeCycleObserver
{
  static dataSourceName: string = 'db';
  static readonly defaultConfig: Options = config;

  constructor(
    @inject('datasources.config.db', {optional: true})
    dsConfig: object = config,
  ) {
    super(dsConfig);
  }
}
