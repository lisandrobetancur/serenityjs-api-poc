import { defineParameterType } from '@cucumber/cucumber';
import { actorCalled, actorInTheSpotlight } from '@serenity-js/core';

/**
 * {actor}: convierte un nombre propio del escenario (p. ej. "Ana") en un Actor de Serenity/JS.
 */
defineParameterType({
    name: 'actor',
    regexp: /[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/,
    transformer: (name: string) => actorCalled(name),
});

/**
 * {pronoun}: hace referencia al último actor que intervino en el escenario.
 */
defineParameterType({
    name: 'pronoun',
    regexp: /él|ella|el actor|la actriz/,
    transformer: () => actorInTheSpotlight(),
});
