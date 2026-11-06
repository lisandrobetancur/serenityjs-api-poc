import { Ability, Masked, Question, UsesAbilities } from '@serenity-js/core';

import type { Persona } from '../actors/Personas';

/**
 * Ability to authenticate against the Prop Room API with a seed user's credentials.
 * Guests do not have this ability, so any task that needs credentials fails fast for them.
 */
export class UseCredentials extends Ability {
    static of(persona: Persona): UseCredentials {
        return new UseCredentials(persona);
    }

    constructor(public readonly persona: Persona) {
        super();
    }

    static email = () =>
        Question.about('the email of the actor', (actor: UsesAbilities) =>
            UseCredentials.as(actor).persona.email);

    static password = () =>
        Masked.valueOf(
            Question.about('the password of the actor', (actor: UsesAbilities) =>
                UseCredentials.as(actor).persona.password),
        );

    static basicAuthHeader = () =>
        Masked.valueOf(
            Question.about('the Basic authorization header of the actor', (actor: UsesAbilities) => {
                const { email, password } = UseCredentials.as(actor).persona;
                return `Basic ${ Buffer.from(`${ email }:${ password }`).toString('base64') }`;
            }),
        );
}
