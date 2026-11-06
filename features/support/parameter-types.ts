import { defineParameterType } from '@cucumber/cucumber';
import { actorCalled, actorInTheSpotlight } from '@serenity-js/core';

import { parseLiteral } from './values';

/**
 * {actor}: a persona name with an optional role hint ("Ada", "Ada the admin", "Gus the guest"),
 * or a pronoun ("he", "she", "they") that refers to the actor in the spotlight.
 */
defineParameterType({
    name: 'actor',
    regexp: /[A-Z][a-z]+(?: the (?:admin|clerk|viewer|guest))?|he|she|they/,
    transformer: (text: string) =>
        [ 'he', 'she', 'they' ].includes(text)
            ? actorInTheSpotlight()
            : actorCalled(text.split(' ')[0]),
});

/**
 * {value}: a JSON-like literal, e.g. "FUR-CHAIR-001", 52, 45.5, true, false or null.
 */
defineParameterType({
    name: 'value',
    regexp: /"[^"]*"|-?\d+(?:\.\d+)?|true|false|null/,
    transformer: (text: string) => parseLiteral(text),
});

/**
 * {transition}: a purchase-order status transition, used as a verb ("submits", "receives", "cancels").
 */
defineParameterType({
    name: 'transition',
    regexp: /submit|receive|cancel/,
    transformer: (text: string) => text,
});

/**
 * {method}: an HTTP method.
 */
defineParameterType({
    name: 'method',
    regexp: /GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS/,
    transformer: (text: string) => text,
});
