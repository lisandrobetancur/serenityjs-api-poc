import { Given, Then, When } from '@cucumber/cucumber';

type Keyword = typeof Given;

/**
 * Registers one function under several phrases: `[his|her|their]` in a pattern expands into one Cucumber
 * expression per option, so each annotation has a single phrase (no alternatives inside one expression)
 * while two phrases with the same body still share one function.
 *
 * `phrases('{actor} refreshes [his|her|their] session')` registers three expressions.
 */
export function phrases(pattern: string): string[] {
    const match = pattern.match(/\[([^\]]+)]/);
    if (!match) {
        return [pattern];
    }
    return match[1]!.split('|').flatMap(option => phrases(pattern.replace(match[0], option)));
}

function register(keyword: Keyword) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cucumber passes step arguments untyped
    return (pattern: string, fn: (...args: any[]) => unknown): void => {
        for (const phrase of phrases(pattern)) {
            keyword(phrase, fn);
        }
    };
}

export const given = register(Given);
export const when = register(When);
export const then = register(Then);
