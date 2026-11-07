import { After, Before } from '@cucumber/cucumber';
import type { Actor } from '@serenity-js/core';

import { ConfigFlags } from '../../src/utils/aws/ConfigFlags';

/**
 * ConfigFlagHook: forces a global flag in the Dynamo config table for scenarios tagged `@requires_mock_x`,
 * remembers the original value, and restores it afterwards with retries and an asserted re-read.
 *
 * Registered from `hooks/index.ts` so its position in the hook order is explicit.
 */
export const ConfigFlagHooks = {
    register(hookActor: () => Actor): void {
        Before({ tags: '@requires_mock_x' }, () => hookActor().attemptsTo(ConfigFlags.force('MOCK_X')));

        After({ tags: '@requires_mock_x' }, () => hookActor().attemptsTo(ConfigFlags.restore('MOCK_X')));
    },
};
