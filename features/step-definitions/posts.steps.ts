import { DataTable, Then, When } from '@cucumber/cucumber';
import { Ensure, equals, isGreaterThan } from '@serenity-js/assertions';
import { Actor } from '@serenity-js/core';

import { NewPost, PostResponse, Posts } from '../../src/screenplay';

/**
 * Step definitions only translate Gherkin into Screenplay Tasks and Questions.
 * The reusable logic lives in src/screenplay, not here.
 */

When('{actor} retrieves all posts', (actor: Actor) =>
    actor.attemptsTo(
        Posts.fetchAll(),
    ));

When('{actor} retrieves the post with id {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Posts.fetchById(id),
    ));

When('{actor} creates a post with the following details:', (actor: Actor, table: DataTable) => {
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

When('{actor} deletes the post with id {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Posts.remove(id),
    ));

Then('{pronoun} should see at least one post', (actor: Actor) =>
    actor.attemptsTo(
        Ensure.that(PostResponse.numberOfPosts(), isGreaterThan(0)),
    ));

Then('{pronoun} should see the post with id {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Ensure.that(PostResponse.post().id, equals(id)),
    ));

Then('{pronoun} should see the post titled {string}', (actor: Actor, title: string) =>
    actor.attemptsTo(
        Ensure.that(PostResponse.post().title, equals(title)),
    ));
