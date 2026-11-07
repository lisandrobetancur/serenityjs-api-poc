import type { ITestCaseHookParameter } from '@cucumber/cucumber';

import { Tenant } from '../../src/utils/tenant/Tenant';
import { EnvironmentConfig } from '../../src/utils/config/EnvironmentConfig';

/** Returned by a `Before` hook to mark the scenario as skipped (it stays in the report, counted apart). */
export const SKIPPED = 'skipped' as const;

export const tagsOf = (scenario: ITestCaseHookParameter): string[] => scenario.pickle.tags.map(tag => tag.name);

/**
 * Status tags: known problems or unfinished work. The scenario is skipped, not deleted, so the report and the
 * run summary still list it under its reason.
 */
export const STATUS_TAGS = ['@wip', '@skip', '@bug_reported', '@finding_reported', '@improvement_reported'] as const;

export function statusTagOf(tags: readonly string[]): string | undefined {
    return STATUS_TAGS.find(tag => tags.includes(tag));
}

/** `@performance` scenarios only run when the tag expression names `@performance`. */
export function isSkippedPerformanceScenario(tags: readonly string[]): boolean {
    return tags.includes('@performance') && !EnvironmentConfig.isPerformanceRun();
}

/**
 * Wall-clock windows. There is no holiday calendar: `@requires_business_day` only excludes weekends.
 *
 * - `@requires_business_day`: Monday to Friday in the tenant's time zone (UTC without a tenant).
 * - `@requires_closed_market`: outside the window in `MARKET_OPEN_HOURS` (default `09:30-16:00`).
 */
export function timeWindowSkipReason(tags: readonly string[], now: Date = new Date()): string | undefined {
    const timeZone = Tenant.fromTags(tags)?.timeZone ?? 'UTC';
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-GB', {
            timeZone,
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        })
            .formatToParts(now)
            .map(part => [part.type, part.value]),
    );
    if (tags.includes('@requires_business_day') && (parts.weekday === 'Sat' || parts.weekday === 'Sun')) {
        return `it is ${parts.weekday} in ${timeZone}`;
    }
    if (tags.includes('@requires_closed_market')) {
        const [open = '09:30', close = '16:00'] = (EnvironmentConfig.flag('MARKET_OPEN_HOURS') ?? '09:30-16:00').split(
            '-',
        );
        const current = `${parts.hour}:${parts.minute}`;
        if (current >= open && current < close) {
            return `the market is open (${open}-${close} ${timeZone})`;
        }
    }
    return undefined;
}
