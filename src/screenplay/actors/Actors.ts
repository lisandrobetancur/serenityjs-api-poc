import { Actor, Cast, Notepad, TakeNotes } from '@serenity-js/core';
import { CallAnApi } from '@serenity-js/rest';

import { environment } from '../../config/environment';
import { UseCredentials } from '../abilities/UseCredentials';
import { ApiNotes } from '../notes/ApiNotes';
import { personas } from './Personas';

/**
 * The Cast defines which Abilities each actor receives.
 * Every actor can call the API and take notes; personas also get their seed credentials.
 */
export class Actors implements Cast {
    constructor(private readonly apiBaseUrl: string = environment.apiBaseUrl) {}

    prepare(actor: Actor): Actor {
        const prepared = actor.whoCan(
            CallAnApi.using({
                baseURL: this.apiBaseUrl,
                timeout: environment.requestTimeout,
                headers: { Accept: 'application/json' },
            }),
            TakeNotes.using(Notepad.empty<ApiNotes>()),
        );

        const persona = personas[actor.name];
        return persona ? prepared.whoCan(UseCredentials.of(persona)) : prepared;
    }
}
