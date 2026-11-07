import { type Actor } from '@serenity-js/core';

import type { ReportRequest } from '../../src/models/types';
import { ReportSteps } from '../steps/ReportSteps';
import { given, when } from './define';

const report = (format: string, type: string, seconds: number) =>
    ({ type, format, duration_seconds: seconds }) as ReportRequest;

when(
    '{actor} requests a {string} {string} report that takes {int} [second|seconds]',
    (actor: Actor, format: string, type: string, seconds: number) =>
        ReportSteps.request(actor, report(format, type, seconds)),
);

given(
    '{actor} has requested a {string} {string} report that takes {int} [second|seconds]',
    (actor: Actor, format: string, type: string, seconds: number) =>
        ReportSteps.requestAndRemember(actor, report(format, type, seconds)),
);

when('{actor} waits for the report to complete', (actor: Actor) => ReportSteps.waitForCompletion(actor));

when('{actor} checks the report job', (actor: Actor) => ReportSteps.checkJob(actor));

when('{actor} checks the job {string}', (actor: Actor, jobId: string) => ReportSteps.checkJobCalled(actor, jobId));

when('{actor} downloads the report', (actor: Actor) => ReportSteps.download(actor));
