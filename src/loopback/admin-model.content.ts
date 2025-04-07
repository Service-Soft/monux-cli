// eslint-disable-next-line jsdoc/require-jsdoc
export const adminModelContent: string
= `import { belongsTo, model, property } from '@loopback/repository';
import { ChangeSetEntity } from 'lbx-change-sets';
import { BaseUser } from 'lbx-jwt';

@model()
export class Admin extends ChangeSetEntity {

    @property({
        type: 'string',
        required: true
    })
    name!: string;

    @belongsTo(() => BaseUser)
    baseUserId!: string;

    constructor(data?: Partial<Admin>) {
        super(data);
    }
}

export interface AdminRelations {
    // describe navigational properties here
}

export type AdminWithRelations = Admin & AdminRelations;`;