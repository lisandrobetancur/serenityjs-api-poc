import { defineParameterType } from '@cucumber/cucumber';
import { actorCalled, actorInTheSpotlight } from '@serenity-js/core';

/**
 * {actor}: turns a proper name used in a scenario (e.g. "Ana") into a Serenity/JS Actor.
 */
defineParameterType({
    name: 'actor',
    regexp: /[A-Z][a-z]+/,
    transformer: (name: string) => actorCalled(name),
});

/**
 * {pronoun}: refers to the actor who most recently took part in the scenario.
 */
defineParameterType({
    name: 'pronoun',
    regexp: /he|she|they/,
    transformer: () => actorInTheSpotlight(),
});
