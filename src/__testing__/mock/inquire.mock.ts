/* eslint-disable jsdoc/require-jsdoc */
import { Question } from 'inquirer';

// eslint-disable-next-line typescript/no-explicit-any
export function inquireMock(answers: Record<string, unknown>): (question: Question) => Promise<any> {
    return (question: Question) => {
        if (typeof question.message !== 'string') {
            throw new Error('Cannot mock questions with messages that are async functions.');
        }

        if (!Object.keys(answers).includes(question.name)) {
            throw new Error(`No answer for the question "${question.name}" has been provided.`);
        }

        // eslint-disable-next-line typescript/no-unsafe-return, typescript/no-explicit-any
        return answers[question.name] as any;
    };
}