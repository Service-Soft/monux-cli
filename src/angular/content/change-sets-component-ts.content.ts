// eslint-disable-next-line jsdoc/require-jsdoc
export const changeSetsComponentTsContent: string
= `import { Component, OnInit } from '@angular/core';
import { ChangeSet, ChangeSetEntity, ChangeSetsComponent, ChangeSetsConfig } from 'ngx-material-change-sets';
import { DecoratorTypes, NgxMatEntityBaseInputComponent } from 'ngx-material-entity';
import { LodashUtilities } from '../../utilities/lodash.utilities';

export interface ChangeSetsInputMetadata {
    changeSetsApiBaseUrl: string,
    config?: Partial<ChangeSetsConfig>
}

@Component({
    selector: 'app-change-sets-input',
    templateUrl: './change-sets-input.component.html',
    standalone: true,
    imports: [ChangeSetsComponent]
})
export class ChangeSetsInputComponent extends NgxMatEntityBaseInputComponent<
    ChangeSetEntity,
    DecoratorTypes.CUSTOM,
    ChangeSet[],
    ChangeSetsInputMetadata
> implements OnInit {

    e: ChangeSetEntity = {
        id: '',
        changeSets: []
    };

    config: Partial<ChangeSetsConfig> = {
        canResetAndRollback: false
    };

    override ngOnInit(): void {
        super.ngOnInit();
        this.e = LodashUtilities.cloneDeep(this.entity);
        this.e.changeSets = this.e.changeSets ?? [];
    }
}`;