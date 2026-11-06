import { notes } from '@serenity-js/core';

/**
 * Values an actor remembers between steps of the same scenario.
 */
export interface ApiNotes {
    accessToken: string;
    refreshToken: string;
    etag: string;
    createdId: number;
    jobId: string;
    nextCursor: string;
    registeredEmail: string;
    sessionCookie: string;
}

export const remembered = () => notes<ApiNotes>();
