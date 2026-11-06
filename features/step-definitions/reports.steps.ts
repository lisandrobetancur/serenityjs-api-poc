import { Given, When } from '@cucumber/cucumber';
import { Actor } from '@serenity-js/core';

import type { ReportRequest } from '../../src/api/types';
import { Reports, Request } from '../../src/screenplay';

const report = (format: string, type: string, seconds: number) =>
    ({ type, format, duration_seconds: seconds }) as ReportRequest;

When('{actor} requests a {string} {string} report that takes {int} second(s)', (actor: Actor, format: string, type: string, seconds: number) =>
    actor.attemptsTo(
        Reports.request(report(format, type, seconds)),
    ));

Given('{actor} has requested a {string} {string} report that takes {int} second(s)', (actor: Actor, format: string, type: string, seconds: number) =>
    actor.attemptsTo(
        Reports.requestAndRememberJob(report(format, type, seconds)),
    ));

When('{actor} waits for the report to complete', (actor: Actor) =>
    actor.attemptsTo(
        Reports.waitForJobToComplete(),
    ));

When('{actor} checks the report job', (actor: Actor) =>
    actor.attemptsTo(
        Reports.checkJob(),
    ));

When('{actor} checks the job {string}', (actor: Actor, jobId: string) =>
    actor.attemptsTo(
        Request.get(`/jobs/${ jobId }`),
    ));

When('{actor} downloads the report', (actor: Actor) =>
    actor.attemptsTo(
        Reports.download(),
    ));
