import { Question, type QuestionAdapter, TakeNotes } from '@serenity-js/core';

import { type Notes } from '../../notes/Notes';

/**
 * Who is expected to write each note, so a missing note fails with a useful message instead of a generic one.
 */
const WRITTEN_BY: Partial<Record<keyof Notes, string>> = {
    sessions: 'a login step (e.g. "Given Ada is logged in")',
    tenant: 'TenantHook (add a tenant tag such as @acme_land)',
    tenantCode: 'TenantHook (add a tenant tag such as @acme_land)',
    scenarioUser: 'ScenarioUserHook (the scenario needs a unique tag with an entry in test-data/scenario-users.json)',
    etag: 'a step that fetches a resource and remembers its ETag',
    createdId: 'a step that creates a resource and remembers its id',
    jobId: 'a step that requests a report and remembers its job',
    lambdaStatusCode: 'InvokeLambda',
    fargateTaskArn: 'RunFargateTask',
};

export class TheNote {
    static called = <K extends keyof Notes>(key: K): QuestionAdapter<Notes[K]> =>
        Question.about<Notes[K]>(`the note "${String(key)}"`, actor => {
            const notepad = TakeNotes.as<TakeNotes<Notes>>(actor).notepad;
            if (!notepad.has(key)) {
                const hint = WRITTEN_BY[key] ? ` It should have been stored by ${WRITTEN_BY[key]}.` : '';
                throw new Error(`The scenario has no note called "${String(key)}".${hint}`);
            }
            return notepad.get(key);
        });

    static isPresent = <K extends keyof Notes>(key: K): QuestionAdapter<boolean> =>
        Question.about<boolean>(`whether the note "${String(key)}" is present`, actor =>
            TakeNotes.as<TakeNotes<Notes>>(actor).notepad.has(key),
        );
}
