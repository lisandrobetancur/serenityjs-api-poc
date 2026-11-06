import { equals } from '@serenity-js/assertions';
import { Duration, Question, Task, Wait } from '@serenity-js/core';
import { CallAnApi, LastResponse } from '@serenity-js/rest';

import type { JobOut, ReportRequest } from '../../api/types';
import { Request } from '../interactions/Request';
import { remembered } from '../notes/ApiNotes';

const jobUrl = (suffix = '') => remembered().get('jobId').as(id => `/jobs/${ id }${ suffix }`);

export class Reports {
    static request = (report: ReportRequest) =>
        Task.where(`#actor requests a ${ report.format ?? 'json' } "${ report.type }" report`,
            Request.post('/reports', report),
        );

    static requestAndRememberJob = (report: ReportRequest) =>
        Task.where(`#actor requests a ${ report.format ?? 'json' } "${ report.type }" report and remembers the job`,
            Reports.request(report),
            remembered().set('jobId', LastResponse.body<JobOut>().id),
        );

    static checkJob = () =>
        Task.where(`#actor checks the report job`,
            Request.get(jobUrl()),
        );

    static waitForJobToComplete = (timeout: Duration = Duration.ofSeconds(15)) =>
        Task.where(`#actor waits for the report job to complete`,
            Wait.upTo(timeout)
                .until(Reports.jobStatus(), equals('completed'))
                .pollingEvery(Duration.ofMilliseconds(250)),
        );

    static download = () =>
        Task.where(`#actor downloads the report`,
            Request.get(jobUrl('/download'), { headers: { Accept: '*/*' } }),
        );

    /**
     * Re-fetches the job on every poll, so it can be used with Wait.until.
     */
    static jobStatus = () =>
        Question.about<string>('the status of the report job', async actor => {
            const url = await actor.answer(jobUrl());
            const response = await CallAnApi.as(actor).request({ method: 'GET', url });
            return (response.data as JobOut).status;
        });
}
