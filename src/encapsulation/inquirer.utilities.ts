import inquirer, { Question, Answers } from 'inquirer';

import { ProcessUtilities } from './process.utilities';

// eslint-disable-next-line jsdoc/require-jsdoc
export type { Question };

/**
 * Inquirer Questions to get the generic object result.
 */
export type QuestionsFor<T> = {
    [key in keyof T]: Question | QuestionsFor<T[key]>;
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

    private static async getResultForQuestion<T>(question: Question | QuestionsFor<T>): Promise<T> {
        if (this.isQuestion(question)) {
            try {
                const res: T = await this.inquire(question);
                return res;
            }
            catch (error) {
                if (ProcessUtilities.isInterrupt(error)) {
                    return await ProcessUtilities.exitWithInterrupt();
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

    private static isQuestion<T>(question: Question | QuestionsFor<T>): question is Question {
        const q: Question = question as Question;
        return q.type != undefined && q.message != undefined;
    }

    private static async inquire<T>(question: Question): Promise<T> {
        const answers: Answers = await inquirer.prompt([question]);
        return answers[question.name] as T;
    }
}