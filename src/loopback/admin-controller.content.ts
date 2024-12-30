// eslint-disable-next-line jsdoc/require-jsdoc
export const adminControllerContent: string
= `import { authenticate } from '@loopback/authentication';
import { authorize } from '@loopback/authorization';
import { inject } from '@loopback/core';
import { IsolationLevel, juggler, repository } from '@loopback/repository';
import { HttpErrors, del, get, getModelSchemaRef, param, patch, post, requestBody } from '@loopback/rest';
import { SecurityBindings, securityId } from '@loopback/security';
import { BaseUser, BaseUserProfile, BaseUserRepository, BaseUserWithRelations, BcryptUtilities, Credentials, DefaultEntityOmitKeys, roleAuthorization } from 'lbx-jwt';

import { FullAdmin } from './full-admin.model';
import { NewAdmin } from './new-admin.model';
import { DbDataSource } from '../../datasources';
import { Admin, AdminWithRelations } from '../../models/admin.model';
import { AdminRepository } from '../../repositories/admin.repository';

@authenticate('jwt')
@authorize({ voters: [roleAuthorization], allowedRoles: [Roles.ADMIN] })
export class AdminController {
    constructor(
        @repository(BaseUserRepository)
        private readonly baseUserRepository: BaseUserRepository<Roles>,
        @repository(AdminRepository)
        private readonly adminRepository: AdminRepository,
        @inject(DbDataSource.INJECTION_KEY)
        private readonly dataSource: DbDataSource
    ) { }

    @post('/admins')
    async create(
        @requestBody({
            content: {
                'application/json': {
                    schema: getModelSchemaRef(NewAdmin, {
                        title: 'NewAdmin',
                        exclude: ['id', 'baseUserId', 'changeSets']
                    })
                }
            }
        })
        newAdmin: Omit<NewAdmin, DefaultEntityOmitKeys | 'changeSets' | 'id' | 'baseUserId'>
    ): Promise<Omit<FullAdmin, DefaultEntityOmitKeys | 'baseUserId'>> {
        const transaction: juggler.Transaction = await this.dataSource.beginTransaction(IsolationLevel.READ_COMMITTED);
        try {
            const baseUser: BaseUser<Roles> = await this.createBaseUser(newAdmin.email, transaction);
            await this.createCredentials(newAdmin.password, baseUser, transaction);
            const finishedAdmin: Admin = await this.createAdmin(newAdmin, baseUser, transaction);
            await transaction.commit();
            return {
                ...finishedAdmin,
                email: baseUser.email,
                roles: baseUser.roles
            };
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    private async createAdmin(
        newAdmin: Omit<NewAdmin, 'id' | 'baseUserId' | 'changeSets' | DefaultEntityOmitKeys>,
        baseUser: BaseUser<Roles>,
        transaction: juggler.Transaction
    ): Promise<Admin> {
        const admin: Omit<Admin, DefaultEntityOmitKeys | 'changeSets' | 'id' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'createdBy'> = {
            name: newAdmin.name,
            baseUserId: baseUser.id
        };
        const finishedAdmin: Admin = await this.adminRepository.create(admin, { transaction: transaction });
        return finishedAdmin;
    }

    private async createCredentials(password: string, baseUser: BaseUser<Roles>, transaction: juggler.Transaction): Promise<void> {
        const credentials: Omit<Credentials, DefaultEntityOmitKeys | 'id' | 'baseUserId'> = {
            password: await BcryptUtilities.hash(password)
        };
        await this.baseUserRepository.credentials(baseUser.id).create(credentials, { transaction: transaction });
    }

    private async createBaseUser(email: string, transaction: juggler.Transaction): Promise<BaseUser<Roles>> {
        const baseUser: Omit<BaseUser<Roles>, DefaultEntityOmitKeys | 'credentials' | 'id'> = {
            email: email,
            roles: [Roles.ADMIN]
        };
        const finishedBaseUser: BaseUser<Roles> = await this.baseUserRepository.create(baseUser, { transaction: transaction });
        return finishedBaseUser;
    }

    @get('/admins')
    async find(): Promise<Omit<FullAdmin, DefaultEntityOmitKeys | 'baseUserId'>[]> {
        const admins: AdminWithRelations[] = await this.adminRepository.find({
            include: [{ relation: 'changeSets', scope: { include: ['changes'] } }]
        });
        const res: Omit<FullAdmin, DefaultEntityOmitKeys | 'baseUserId'>[] = [];
        for (const admin of admins) {
            const baseUser: BaseUserWithRelations<Roles> | null = await this.baseUserRepository.findById(admin.baseUserId);
            res.push({
                ...admin,
                roles: baseUser.roles,
                email: baseUser.email
            });
        }
        return res;
    }

    @get('/admins/me')
    async getCurrentAdmin(
        @inject(SecurityBindings.USER)
        userProfile: BaseUserProfile<Roles>
    ): Promise<Omit<FullAdmin, DefaultEntityOmitKeys | 'baseUserId'>> {
        const baseUser: BaseUser<Roles> = await this.baseUserRepository.findById(userProfile[securityId]);
        const admin: AdminWithRelations | null = await this.adminRepository.findOne({
            where: { baseUserId: baseUser.id },
            include: [{ relation: 'changeSets', scope: { include: ['changes'] } }]
        });
        if (admin == undefined) {
            throw new HttpErrors.NotFound('An admin account for the logged in base user could not be found');
        }
        return {
            ...admin,
            email: baseUser.email,
            roles: baseUser.roles
        };
    }

    @patch('/admins/me')
    async updateMe(
        @requestBody({
            required: true,
            content: {
                'application/json': {
                    schema: getModelSchemaRef(FullAdmin, {
                        partial: true,
                        exclude: ['id', 'roles']
                    })
                }
            }
        })
        adminData: Partial<Omit<FullAdmin, DefaultEntityOmitKeys | 'id' | 'roles'>>,
        @inject(SecurityBindings.USER)
        userProfile: BaseUserProfile<Roles>
    ): Promise<void> {
        const transaction: juggler.Transaction = await this.dataSource.beginTransaction(IsolationLevel.READ_COMMITTED);
        try {
            await this.baseUserRepository.updateById(userProfile.id, adminData, { transaction: transaction });
            const admin: AdminWithRelations | null = await this.adminRepository.findOne({
                where: { baseUserId: userProfile.id },
                include: [{ relation: 'changeSets', scope: { include: ['changes'] } }]
            });
            if (admin == undefined) {
                throw new HttpErrors.NotFound('An admin account for the logged in base user could not be found');
            }
            await this.adminRepository.updateById(admin.id, adminData, { transaction: transaction });
            await transaction.commit();
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    @patch('/admins/{id}')
    async update(
        @requestBody({
            required: true,
            content: {
                'application/json': {
                    schema: getModelSchemaRef(FullAdmin, {
                        partial: true,
                        exclude: ['id', 'roles']
                    })
                }
            }
        })
        adminData: Partial<Omit<FullAdmin, DefaultEntityOmitKeys | 'id' | 'roles'>>,
        @param.path.string('id')
        adminId: string
    ): Promise<Omit<FullAdmin, DefaultEntityOmitKeys>> {
        const admin: AdminWithRelations | null = await this.adminRepository.findById(
            adminId,
            { include: [{ relation: 'changeSets', scope: { include: ['changes'] } }] }
        );

        const transaction: juggler.Transaction = await this.dataSource.beginTransaction(IsolationLevel.READ_COMMITTED);
        try {
            if (adminData.name) {
                await this.adminRepository.updateById(adminId, { name: adminData.name }, { transaction: transaction });
            }
            if (adminData.email) {
                await this.baseUserRepository.updateById(admin.baseUserId, { email: adminData.email }, { transaction: transaction });
            }
            await transaction.commit();
            const baseUser: BaseUser<Roles> = await this.baseUserRepository.findById(admin.baseUserId);
            return {
                ...await this.adminRepository.findById(
                    admin.id,
                    { include: [{ relation: 'changeSets', scope: { include: ['changes'] } }] }
                ),
                email: baseUser.email,
                roles: baseUser.roles
            };
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    @del('/admins/{id}')
    async deleteById(
        @param.path.string('id')
        adminId: string
    ): Promise<void> {
        if ((await this.adminRepository.count()).count <= 1) {
            throw new HttpErrors.UnprocessableEntity('The last admin-account cannot be deleted!');
        }
        const admin: AdminWithRelations | null = await this.adminRepository.findById(adminId);

        const transaction: juggler.Transaction = await this.dataSource.beginTransaction(IsolationLevel.READ_COMMITTED);
        try {
            await this.baseUserRepository.credentials(admin.baseUserId).delete({ transaction: transaction });
            await this.baseUserRepository.deleteById(admin.baseUserId, { transaction: transaction });
            await this.adminRepository.deleteById(admin.id, { transaction: transaction });
            await transaction.commit();
        }
        catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}`;