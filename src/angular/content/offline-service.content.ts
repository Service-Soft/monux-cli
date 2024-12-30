// eslint-disable-next-line jsdoc/require-jsdoc
export const offlineServiceContent: string
= `import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgxPwaOfflineService } from 'ngx-pwa';

@Injectable({ providedIn: 'root' })
export class OfflineService extends NgxPwaOfflineService {
    constructor(http: HttpClient, snackbar: MatSnackBar, ngZone: NgZone) {
        super(http, snackbar, ngZone);
    }
}`;