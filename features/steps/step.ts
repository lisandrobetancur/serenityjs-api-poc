import { type Activity, type Actor, Task } from '@serenity-js/core';

/**
 * A Step: one named node in the report that performs one action and/or its assertions.
 * Definitions call Steps; Steps never call other Steps.
 *
 * `title` is shown in the report; use `#actor` for the actor's name.
 */
export const step = (actor: Actor, title: string, ...activities: Activity[]): Promise<void> =>
    actor.attemptsTo(Task.where(title, ...activities));
