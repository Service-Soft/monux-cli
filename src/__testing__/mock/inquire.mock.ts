/* eslint-disable jsdoc/require-jsdoc */
import { BuiltInQuestion } from 'inquirer/dist/cjs/types/types';

// eslint-disable-next-line typescript/no-explicit-any
export function inquireMock(answers: Record<string, unknown>): (question: BuiltInQuestion) => Promise<any> {
    return (question: BuiltInQuestion) => {
        if (typeof question.message !== 'string') {
            throw new Error('Cannot mock questions with messages that are async functions.');
        }

        if (!Object.keys(answers).includes(question.message)) {
            throw new Error(`No answer for the question "${question.message}" has been provided.`);
        }

        // eslint-disable-next-line typescript/no-unsafe-return, typescript/no-explicit-any
        return answers[question.message] as any;
    };
}