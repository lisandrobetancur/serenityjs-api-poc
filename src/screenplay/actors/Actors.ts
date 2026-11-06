import { Actor, Cast, TakeNotes } from '@serenity-js/core';
import { CallAnApi } from '@serenity-js/rest';

import { environment } from '../../config/environment';

/**
 * The Cast defines which Abilities each actor receives.
 * Every actor can call the API and take notes to share data between steps.
 */
export class Actors implements Cast {
    constructor(private readonly apiBaseUrl: string = environment.apiBaseUrl) {}

    prepare(actor: Actor): Actor {
        return actor.whoCan(
            CallAnApi.using({
                baseURL: this.apiBaseUrl,
                timeout: environment.requestTimeout,
                headers: { Accept: 'application/json' },
            }),
            TakeNotes.usingAnEmptyNotepad(),
        );
    }
}
