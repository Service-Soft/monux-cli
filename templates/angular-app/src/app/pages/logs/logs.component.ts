import { Component } from '@angular/core';
import { LogHistoryComponent } from '@service-soft/ngx-persistence-logger/log-history';
import { API_LOG_APPLICATION, ApiRoute, LogApplication } from '{{=contractPackage}}';

import { environment } from '../../../environment/environment';

@Component({
    selector: 'app-logs',
    templateUrl: './logs.component.html',
    imports: [LogHistoryComponent]
})
export class LogsComponent {
    protected readonly logsUrl: string = `${environment.{{=apiPrefix}}_base_url}/${ApiRoute.LOGS}`;
    // the logs of the api itself and of every app that sends its logs to it
    protected readonly applications: string[] = [API_LOG_APPLICATION, ...Object.values(LogApplication)];
}
