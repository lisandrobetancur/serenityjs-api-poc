import { Actor, Cast, TakeNotes } from '@serenity-js/core';
import { CallAnApi } from '@serenity-js/rest';

import { environment } from '../../config/environment';

/**
 * El elenco (Cast) define qué habilidades (Abilities) recibe cada actor.
 * Todos los actores pueden llamar a la API y tomar notas para compartir datos entre pasos.
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
