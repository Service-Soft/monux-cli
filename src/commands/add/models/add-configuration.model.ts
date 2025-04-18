import { QuestionsFor } from '../../../encapsulation';
import { getPath } from '../../../utilities';
import { WorkspaceUtilities } from '../../../workspace';

/**
 * The type of project to add.
 */
export enum AddType {
    ANGULAR = 'angular',
    ANGULAR_WEBSITE = 'angular-website',
    ANGULAR_LIBRARY = 'angular-library',
    LOOPBACK = 'loopback',
    TS_LIBRARY = 'ts-library',
    WORDPRESS = 'wordpress'
}

/**
 * BaseConfiguration for the add cli command.
 */
export type AddConfiguration = {
    /**
     * The type of project to add.
     */
    type: AddType,
    /**
     * The name of the new project.
     */
    name: string
};

/**
 * Questions for getting the base configuration for adding a new project to a monorepo.
 */
export const addConfigurationQuestions: QuestionsFor<AddConfiguration> = {
    type: {
        type: 'select',
        choices: Object.values(AddType),
        message: 'type'
    },
    name: {
        type: 'input',
        message: 'name',
        required: true,
        validate: async (input: string) => await WorkspaceUtilities.findProject(input, getPath('.')) == undefined
    }
};