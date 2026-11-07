import { Ensure, equals, isFalse } from '@serenity-js/assertions';
import { type Activity, Interaction, Question, Task } from '@serenity-js/core';

import { ExpireDynamoItem } from '../../../screenplay/interactions/aws/DynamoInteractions';
import { GetDisablingKey, GetTimeLock, type TimeLock } from '../../../screenplay/questions/aws/AwsQuestions';
import { EnvironmentConfig } from '../../config/EnvironmentConfig';
import { ReportEvidence } from '../../report/ReportEvidence';
import { WaitUtils } from '../../wait/WaitUtils';
import { DynamoTables } from '../ResourceNames';
import { type CronDefinition, disablingKeysOf, lockKeyOf } from './CronLocks';
import { CronLaunchTurn } from './CronLaunchTurn';

/**
 * Makes sure a cron the backend protects with a Dynamo lock can be launched, then launches it:
 *
 * 1. `verifyEnabled`: none of its disabling keys is active (asserted, so it shows in the report);
 * 2. takes the cross-process launch turn for its lock key;
 * 3. polls the lock every `lockPollSeconds` up to `lockMaxWaitSeconds`; if it is still held and not
 *    `lockedTilEnd`, expires it (`ExpireDynamoItem`), re-reads and asserts it is free;
 * 4. runs `launch` and waits the settle time before releasing the turn.
 */
export class CronLaunchGate {
    static verifyEnabled(cron: CronDefinition): Activity {
        return Task.where(
            `#actor checks that the cron ${cron.handler} is enabled`,
            Ensure.that(
                GetDisablingKey.forKeys(disablingKeysOf(cron), DynamoTables.APP_CONFIG()).describedAs(
                    'active disabling key:',
                ),
                equals<string | undefined>(undefined),
            ),
        );
    }

    static launch(cron: CronDefinition, launch: Activity): Activity {
        const settings = EnvironmentConfig.cron();
        const lockKey = lockKeyOf(cron);
        const maxPolls = Math.max(1, Math.ceil(settings.lockMaxWaitSeconds / settings.lockPollSeconds));

        return Task.where(
            `#actor launches the cron ${cron.handler} once its lock is free`,
            CronLaunchGate.verifyEnabled(cron),
            Interaction.where(`#actor takes the launch turn of ${lockKey}, frees the lock and launches`, async actor =>
                CronLaunchTurn.take(lockKey, settings.settleSeconds, async () => {
                    const lock = await actor.answer(
                        WaitUtils.pollUntil<TimeLock>(
                            `the lock ${lockKey}`,
                            pollingActor => pollingActor.answer(GetTimeLock.withKey(lockKey)),
                            current => !current.isHeld(),
                            settings.lockPollSeconds,
                            maxPolls,
                        ),
                    );

                    if (lock.isHeld()) {
                        ReportEvidence.show(
                            actor,
                            `Lock ${lockKey} still held`,
                            `seconds left: ${lock.secondsLeft()}\nlockedTilEnd: ${lock.lockedTilEnd}`,
                        );
                        if (lock.lockedTilEnd) {
                            throw new Error(
                                `The lock ${lockKey} is held until the cron ends (${lock.secondsLeft()} s left); it cannot be expired safely`,
                            );
                        }
                        await ExpireDynamoItem.inTable(DynamoTables.CRON_LOCKS()).withKey(lockKey).performAs(actor);
                    }

                    const after = await actor.answer(GetTimeLock.withKey(lockKey));
                    await Ensure.that(
                        Question.about(`lock ${lockKey} held:`, () => after.isHeld()),
                        isFalse(),
                    ).performAs(actor);
                    await launch.performAs(actor);
                }),
            ),
        );
    }
}
