import inquirer from 'inquirer';
import { BuiltInQuestion, Answers } from 'inquirer/dist/cjs/types/types';

import { exitWithInterrupt, isErrorWithSignal, isExitPromptError } from '../utilities';

/**
 * Inquirer Questions to get the generic object result.
 */
export type QuestionsFor<T> = {
    [key in keyof T]: BuiltInQuestion | QuestionsFor<T[key]>;
};

/**
 * Encapsulates functionality of the inquirer package.
 */
export abstract class InquirerUtilities {
    /**
     * Prompts the user for console input.
     * @param questionsFor - The questions to ask the user.
     * @returns The inputs from the user.
     */
    static async prompt<T>(questionsFor: QuestionsFor<T>): Promise<T> {
        const res: T = {} as T;
        for (const key in questionsFor) {
            res[key] = await this.getResultForQuestion(questionsFor[key]);
        }
        return res;
    }

    private static async getResultForQuestion<T>(question: BuiltInQuestion | QuestionsFor<T>): Promise<T> {
        if (this.isQuestion(question)) {
            try {
                const res: T = await this.inquire(question);
                return res;
            }
            catch (error) {
                if (isExitPromptError(error) || (isErrorWithSignal(error) && error.signal === 'SIGINT')) {
                    return await exitWithInterrupt();
                }
                else {
                    throw error;
                }
            }
        }
        const res: T = {} as T;
        for (const key in question) {
            res[key] = await this.getResultForQuestion(question[key]);
        }
        return res;
    }

    private static isQuestion<T>(question: BuiltInQuestion | QuestionsFor<T>): question is BuiltInQuestion {
        const q: BuiltInQuestion = question as BuiltInQuestion;
        return q.type != undefined && q.message != undefined;
    }

    private static async inquire<T>(question: BuiltInQuestion): Promise<T> {
        const answers: Answers = await inquirer.prompt([question]);
        return answers[''] as T;
    }
}