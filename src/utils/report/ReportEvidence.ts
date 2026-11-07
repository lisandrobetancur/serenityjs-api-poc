import { type Activity, type CollectsArtifacts, Interaction, Task } from '@serenity-js/core';
import { Name, TextData } from '@serenity-js/core/model';

import { ReportBuffer } from './ReportBuffer';

/**
 * Text evidence in the report. Every helper respects `ReportBuffer`, so evidence produced inside a poll only
 * appears for the final attempt.
 */
export class ReportEvidence {
    /**
     * Attaches `contents` to the activity that is running now.
     * Call it from inside an Interaction, a Question or a Task callback.
     */
    static show(actor: CollectsArtifacts, title: string, contents: string): void {
        const publication = (target: CollectsArtifacts, suffix: string) =>
            target.collect(
                TextData.fromJSON({ contentType: 'text/plain', data: contents }),
                new Name(`${title}${suffix}`),
            );

        if (ReportBuffer.isHoldingBack()) {
            ReportBuffer.holdBack(publication);
        } else {
            publication(actor, '');
        }
    }

    /** Shows one row as a two-line text table (`headers` over `values`). */
    static showRow(actor: CollectsArtifacts, title: string, headers: string[], values: unknown[]): void {
        ReportEvidence.show(
            actor,
            title,
            textTable([headers, values.map(value => (value === null || value === undefined ? 'NULL' : String(value)))]),
        );
    }

    /**
     * A sub-step titled `stepTitle` that carries the evidence; visible when the parent step is expanded.
     */
    static attach(stepTitle: string, title: string, contents: string): Activity {
        return Interaction.where(stepTitle, actor => ReportEvidence.show(actor, title, contents));
    }
}

/**
 * Opens a report node that is not a Step, e.g. around evidence or around what a hook does.
 */
export class ReportStep {
    static within(title: string, ...activities: Activity[]): Activity {
        return Task.where(title, ...activities);
    }
}

/**
 * Wraps everything a hook reads, writes or asserts in one collapsible node, so its evidence is not left loose
 * before the first Gherkin step.
 */
export class HookStep {
    static before(description: string, ...activities: Activity[]): Activity {
        return Task.where(`Hook before · ${description}`, ...activities);
    }

    static after(description: string, ...activities: Activity[]): Activity {
        return Task.where(`Hook after · ${description}`, ...activities);
    }

    static detail(description: string, ...activities: Activity[]): Activity {
        return Task.where(description, ...activities);
    }
}

/** Renders rows as an aligned plain-text table. */
export function textTable(rows: string[][]): string {
    const widths = rows[0]?.map((_, column) => Math.max(...rows.map(row => (row[column] ?? '').length))) ?? [];
    const line = (row: string[]) => `| ${row.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join(' | ')} |`;
    const separator = `|${widths.map(width => '-'.repeat(width + 2)).join('|')}|`;
    const [header, ...body] = rows;
    return header ? [line(header), separator, ...body.map(line)].join('\n') : '';
}
