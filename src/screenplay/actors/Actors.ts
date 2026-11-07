import { type Actor, type Cast, TakeNotes } from '@serenity-js/core';

import { EnvironmentConfig } from '../../utils/config/EnvironmentConfig';
import { CallTheApi } from '../abilities/CallTheApi';
import { UseCredentials } from '../abilities/UseCredentials';
import { SceneNotepad } from '../notes/Notes';
import { personas } from './Personas';

/** Name of the actor used by hooks and by steps that do not name a persona. */
export const DEFAULT_ACTOR = process.env.DEFAULT_ACTOR ?? 'Tester';

/**
 * Prepares every actor of a scene:
 *
 * - `CallTheApi` pointing at the environment's base URL (timeouts, status 0 on no response, response time);
 * - `TakeNotes` with the scene notepad shared by all actors of the scenario;
 * - `UseCredentials` when the actor's name is one of the personas.
 *
 * Other abilities (database, Dynamo, S3, Lambda, ECS) are given on demand by the steps or hooks that need them,
 * with `actor.whoCan(...)`. Serenity/JS creates and dismisses actors per scene, so no ThreadLocal is needed.
 */
export class Actors implements Cast {
    constructor(private readonly apiBaseUrl: string = EnvironmentConfig.apiBaseUrl()) {}

    prepare(actor: Actor): Actor {
        const prepared = actor.whoCan(CallTheApi.atBaseUrl(this.apiBaseUrl), TakeNotes.using(SceneNotepad.get()));
        const persona = personas[actor.name];
        return persona ? prepared.whoCan(UseCredentials.of(persona)) : prepared;
    }
}
