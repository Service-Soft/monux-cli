import { Component } from '@angular/core';

@Component({
    selector: 'app-{{=fileName}}',
    templateUrl: './{{=fileName}}.component.html'
})
export class {{=className}} {}
