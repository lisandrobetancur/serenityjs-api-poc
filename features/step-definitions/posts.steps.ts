import { DataTable, Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isGreaterThan } from '@serenity-js/assertions';
import { Actor } from '@serenity-js/core';

import { NewPost, PostResponse, Posts } from '../../src/screenplay';

/**
 * Los step definitions solo traducen el lenguaje Gherkin a Tasks y Questions del Screenplay.
 * La lógica vive en src/screenplay, no aquí.
 */

When('{actor} consulta todas las publicaciones', (actor: Actor) =>
    actor.attemptsTo(
        Posts.fetchAll(),
    ));

When('{actor} consulta la publicación con id {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Posts.fetchById(id),
    ));

When('{actor} crea una publicación con los siguientes datos:', (actor: Actor, table: DataTable) => {
    const [ row ] = table.hashes();
    const post: NewPost = {
        userId: Number(row.userId),
        title: row.title,
        body: row.body,
    };

    return actor.attemptsTo(
        Posts.create(post),
    );
});

When('{actor} elimina la publicación con id {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Posts.remove(id),
    ));

Then('{pronoun} debería ver al menos una publicación', (actor: Actor) =>
    actor.attemptsTo(
        Ensure.that(PostResponse.numberOfPosts(), isGreaterThan(0)),
    ));

Then('{pronoun} debería ver la publicación con id {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Ensure.that(PostResponse.post().id, equals(id)),
    ));

Then('{pronoun} debería ver la publicación con título {string}', (actor: Actor, title: string) =>
    actor.attemptsTo(
        Ensure.that(PostResponse.post().title, equals(title)),
    ));
