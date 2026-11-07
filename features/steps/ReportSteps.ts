import { Ensure, equals } from '@serenity-js/assertions';
import { type Actor } from '@serenity-js/core';

import type { ReportRequest } from '../../src/models/types';
import { Reports, TheStatusCode } from '../../src/screenplay';
import { step } from './step';

export const ReportSteps = {
    request: (actor: Actor, payload: ReportRequest) =>
        step(actor, `#actor requests a ${payload.format} "${payload.type}" report`, Reports.request(payload)),

    /** Precondition: request, check the 202 gate and remember the job. */
    requestAndRemember: (actor: Actor, payload: ReportRequest) =>
        step(
            actor,
            `#actor has requested a ${payload.format} "${payload.type}" report`,
            Reports.request(payload),
            Ensure.that(TheStatusCode.was(), equals(202)),
            Reports.rememberTheJob(),
        ),

    /**
     * Poll and assertion in one Step: the job is polled until it completes and only the final call is reported,
     * numbered `· call N of M`. The assertion names the final state.
     */
    waitForCompletion: (actor: Actor) =>
        step(
            actor,
            '#actor waits for the report job to complete',
            Ensure.that(Reports.jobStatusOnceFinished(), equals('completed')),
        ),

    checkJob: (actor: Actor) => step(actor, '#actor checks the report job', Reports.checkTheJob()),

    checkJobCalled: (actor: Actor, jobId: string) =>
        step(actor, `#actor checks the job "${jobId}"`, Reports.checkTheJobCalled(jobId)),

    download: (actor: Actor) => step(actor, '#actor downloads the report', Reports.download()),
};
