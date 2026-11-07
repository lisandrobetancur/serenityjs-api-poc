import { type Ability, type AbilityType, type UsesAbilities } from '@serenity-js/core';

/**
 * Returns the actor's ability of `type`, giving it to the actor first when it does not have one yet.
 * This is how DB and AWS abilities are added on demand, instead of preparing every actor with all of them.
 */
export function abilityOf<A extends Ability>(actor: UsesAbilities, type: AbilityType<A>, create: () => A): A {
    const candidate = actor as UsesAbilities & {
        hasAbilityTo?: (t: AbilityType<A>) => boolean;
        whoCan?: (...a: Ability[]) => unknown;
    };
    if (candidate.hasAbilityTo && !candidate.hasAbilityTo(type) && candidate.whoCan) {
        candidate.whoCan(create());
    }
    return actor.abilityTo(type);
}
