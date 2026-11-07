import { Ensure, equals } from '@serenity-js/assertions';
import { type Activity, Interaction, Question, TakeNotes } from '@serenity-js/core';

import { UpdateDynamoItem } from '../../screenplay/interactions/aws/DynamoInteractions';
import { type Notes } from '../../screenplay/notes/Notes';
import { GetDynamoItem } from '../../screenplay/questions/aws/AwsQuestions';
import { EnvironmentConfig } from '../config/EnvironmentConfig';
import { logger } from '../log/logger';
import { HookStep, ReportEvidence } from '../report/ReportEvidence';
import { WaitUtils } from '../wait/WaitUtils';
import { DynamoTables } from './ResourceNames';

const RESTORE_ATTEMPTS = 5;
const RESTORE_WAIT_SECONDS = Number(process.env.CONFIG_FLAG_RESTORE_WAIT_SECONDS ?? 30);

/**
 * Global flags stored in the Dynamo config table (item `Id = <flag>`, attribute `value`).
 *
 * `force(flag)` writes `"true"` (or `"false"` when the environment variable with the flag's name is `off`),
 * remembers the original value in the notes and asserts the new value.
 * `restore(flag)` writes the original value back with retries (5 × 30 s) and an asserted re-read: a network blip
 * once left a global flag wrong for everyone.
 */
export const ConfigFlags = {
    force: (flag: string): Activity => {
        const target = EnvironmentConfig.flag(flag)?.toLowerCase() === 'off' ? 'false' : 'true';
        const table = DynamoTables.APP_CONFIG();
        return HookStep.before(
            `Force the config flag ${flag} to "${target}"`,
            Interaction.where(`#actor remembers the original value of ${flag}`, async actor => {
                const item = await actor.answer(GetDynamoItem.fromTable(table).byKey(flag));
                TakeNotes.as<TakeNotes<Notes>>(actor).notepad.set('originalConfigFlag', item.value ?? 'false');
                ReportEvidence.show(actor, `Original value of ${flag}`, item.value ?? '(not set)');
            }),
            UpdateDynamoItem.inTable(table).withKey(flag).field('value').to(target),
            Ensure.that(
                GetDynamoItem.fromTable(table)
                    .byKey(flag)
                    .as(item => item.value)
                    .describedAs(`${flag}:`),
                equals(target),
            ),
        );
    },

    restore: (flag: string): Activity => {
        const table = DynamoTables.APP_CONFIG();
        return HookStep.after(
            `Restore the config flag ${flag}`,
            Interaction.where(`#actor writes back the original value of ${flag}`, async actor => {
                const notepad = TakeNotes.as<TakeNotes<Notes>>(actor).notepad;
                if (!notepad.has('originalConfigFlag')) {
                    return;
                }
                const original = notepad.get('originalConfigFlag');
                for (let attempt = 1; ; attempt++) {
                    try {
                        await UpdateDynamoItem.inTable(table)
                            .withKey(flag)
                            .field('value')
                            .to(original)
                            .performAs(actor);
                        const value = (await actor.answer(GetDynamoItem.fromTable(table).byKey(flag))).value;
                        await Ensure.that(
                            Question.about(`${flag}:`, () => value),
                            equals(original),
                        ).performAs(actor);
                        return;
                    } catch (error) {
                        if (attempt >= RESTORE_ATTEMPTS) {
                            throw error;
                        }
                        logger.warn(
                            { flag, attempt, error: String(error) },
                            'Restoring a config flag failed; retrying',
                        );
                        await WaitUtils.waitSeconds(RESTORE_WAIT_SECONDS, `retry restoring ${flag}`);
                    }
                }
            }),
        );
    },
};
