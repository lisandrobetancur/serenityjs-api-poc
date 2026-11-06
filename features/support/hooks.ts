import { Before } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';

import { Platform } from '../../src/screenplay';

/**
 * Every scenario starts from the predictable seed data.
 * The reset also clears tokens, idempotency keys, rate limits, report jobs and maintenance mode.
 */
Before(() =>
    actorCalled('Stagehand').attemptsTo(
        Platform.resetToSeedData(),
    ));
