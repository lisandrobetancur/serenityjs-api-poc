import { LastResponse } from '@serenity-js/rest';

import type { JobOut, ReportRequest } from '../../../models/types';
import { Endpoints } from '../../../utils/constants/Endpoints';
import { WaitUtils } from '../../../utils/wait/WaitUtils';
import { ApiGet, ApiPost } from '../../interactions/api/ApiCall';
import { scene } from '../../notes/Notes';

export const Reports = {
    request: (payload: ReportRequest) => ApiPost.to(Endpoints.REPORTS).authenticated().withBody(payload),

    rememberTheJob: () => scene().set('jobId', LastResponse.body<JobOut>().id),

    checkTheJob: () =>
        ApiGet.to(Endpoints.JOB)
            .authenticated()
            .withPathParams({ jobId: scene().get('jobId') }),

    checkTheJobCalled: (jobId: string) => ApiGet.to(Endpoints.JOB).authenticated().withPathParams({ jobId }),

    download: () =>
        ApiGet.to(Endpoints.JOB_DOWNLOAD)
            .authenticated()
            .withPathParams({ jobId: scene().get('jobId') })
            .withHeader('Accept', '*/*'),

    /**
     * The status of the remembered job, polled until it is completed.
     * Only the final call reaches the report, as `GET /jobs/{jobId} · call N of M`.
     */
    jobStatusOnceFinished: (intervalSeconds = 0.5, maxRetries = 30) =>
        WaitUtils.pollUntil(
            'the status of the report job',
            async actor => {
                await Reports.checkTheJob().performAs(actor as never);
                return actor.answer(LastResponse.body<JobOut>().status);
            },
            status => status === 'completed',
            intervalSeconds,
            maxRetries,
        ),
};
