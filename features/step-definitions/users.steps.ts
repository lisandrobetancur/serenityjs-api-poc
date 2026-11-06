import { When } from '@cucumber/cucumber';
import { Actor } from '@serenity-js/core';

import type { UserRole } from '../../src/api/types';
import { Users } from '../../src/screenplay';

When('{actor} asks who (he)(she)(they) (is)(are)', (actor: Actor) =>
    actor.attemptsTo(
        Users.who(),
    ));

When('{actor} lists the users', (actor: Actor) =>
    actor.attemptsTo(
        Users.list(),
    ));

When('{actor} lists the users with the role {string}', (actor: Actor, role: UserRole) =>
    actor.attemptsTo(
        Users.list({ role }),
    ));

When('{actor} fetches user {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Users.fetch(id),
    ));

When('{actor} renames user {int} to {string}', (actor: Actor, id: number, name: string) =>
    actor.attemptsTo(
        Users.rename(id, name),
    ));

When('{actor} changes the role of user {int} to {string}', (actor: Actor, id: number, role: UserRole) =>
    actor.attemptsTo(
        Users.changeRole(id, role),
    ));

When('{actor} deletes user {int}', (actor: Actor, id: number) =>
    actor.attemptsTo(
        Users.remove(id),
    ));
