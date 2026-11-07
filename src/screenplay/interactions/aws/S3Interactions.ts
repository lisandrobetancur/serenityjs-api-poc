import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Interaction, TakeNotes } from '@serenity-js/core';
import ExcelJS from 'exceljs';

import { S3ConnectionError } from '../../../errors/IntegrationErrors';
import { ReportEvidence } from '../../../utils/report/ReportEvidence';
import { InteractWithS3 } from '../../abilities/aws/AwsAbilities';
import { abilityOf } from '../../abilities/aws/onDemand';
import { type Notes } from '../../notes/Notes';

const s3 = (actor: Parameters<typeof abilityOf>[0]) =>
    abilityOf(actor, InteractWithS3, () => InteractWithS3.usingTheDefaultClient()).client;

export const DOWNLOAD_ROOT = process.env.DOWNLOAD_ROOT ?? 'target/downloads';

type Rows = Array<Record<string, string | number>>;
type ContentSource = { describe: string; contentType: string; bytes: () => Promise<Uint8Array> };

/**
 * Uploads a file to S3. Every source ends in the same `PutObject`:
 *
 * - `fromResource(path)`              a file as it is
 * - `withContent(bytes)`              in-memory bytes
 * - `fromExcelTemplate(path, rows)`   opens the template, removes its data rows and writes one row per map,
 *                                     placing values by header; numbers stay numbers; an unknown header is an error
 * - `fromCsvTemplate(path, rows)`     the template's header line, `;` separator, same rules
 */
export const UploadFileToS3 = {
    fromResource: (path: string) =>
        destination({
            describe: basename(path),
            contentType: 'application/octet-stream',
            bytes: () => Promise.resolve(readFileSync(path)),
        }),

    withContent: (bytes: Uint8Array, contentType = 'application/octet-stream') =>
        destination({ describe: `${bytes.byteLength} bytes`, contentType, bytes: () => Promise.resolve(bytes) }),

    fromExcelTemplate: (templatePath: string, rows: Rows) =>
        destination({
            describe: `${basename(templatePath)} with ${rows.length} row(s)`,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            bytes: () => fillExcelTemplate(templatePath, rows),
        }),

    fromCsvTemplate: (templatePath: string, rows: Rows) =>
        destination({
            describe: `${basename(templatePath)} with ${rows.length} row(s)`,
            contentType: 'text/csv',
            bytes: () => Promise.resolve(fillCsvTemplate(templatePath, rows)),
        }),
};

function destination(source: ContentSource) {
    return {
        toBucket: (bucket: string) => ({
            withKey: (key: string) =>
                Interaction.where(`#actor uploads ${source.describe} to s3://${bucket}/${key}`, async actor => {
                    const body = await source.bytes();
                    try {
                        await s3(actor).send(
                            new PutObjectCommand({
                                Bucket: bucket,
                                Key: key,
                                Body: body,
                                ContentType: source.contentType,
                            }),
                        );
                    } catch (error) {
                        throw new S3ConnectionError(`Could not upload s3://${bucket}/${key}`, error);
                    }
                    if (source.contentType.startsWith('text/')) {
                        ReportEvidence.show(actor, `PutObject s3://${bucket}/${key}`, new TextDecoder().decode(body));
                    }
                }),
        }),
    };
}

/** Downloads to `<root>/S3/<directory>/<file>`, replacing an existing file, and stores the path in the notes. */
export const DownloadFileFromS3 = {
    fromBucket: (bucket: string) => ({
        withKey: (key: string) => ({
            toDirectory: (directory: string) =>
                Interaction.where(`#actor downloads s3://${bucket}/${key}`, async actor => {
                    try {
                        const { Body } = await s3(actor).send(new GetObjectCommand({ Bucket: bucket, Key: key }));
                        const target = join(DOWNLOAD_ROOT, 'S3', directory);
                        mkdirSync(target, { recursive: true });
                        const path = join(target, basename(key));
                        writeFileSync(path, await Body!.transformToByteArray());
                        TakeNotes.as<TakeNotes<Notes>>(actor).notepad.set('downloadedFilePath', path);
                    } catch (error) {
                        throw new S3ConnectionError(`Could not download s3://${bucket}/${key}`, error);
                    }
                }),
        }),
    }),
};

/** Idempotent: deleting a missing object succeeds. */
export const DeleteFileFromS3 = {
    fromBucket: (bucket: string) => ({
        withKey: (key: string) =>
            Interaction.where(`#actor deletes s3://${bucket}/${key}`, async actor => {
                try {
                    await s3(actor).send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
                } catch (error) {
                    throw new S3ConnectionError(`Could not delete s3://${bucket}/${key}`, error);
                }
            }),
    }),
};

// ---------------------------------------------------------------------------------------------------------------------

function columnOrder(headers: string[], rows: Rows, template: string): void {
    for (const row of rows) {
        const unknown = Object.keys(row).filter(column => !headers.includes(column));
        if (unknown.length > 0) {
            throw new Error(
                `Template ${template} has no column ${unknown.map(column => `"${column}"`).join(', ')}. Columns: ${headers.join(', ')}`,
            );
        }
    }
}

function fillCsvTemplate(templatePath: string, rows: Rows): Uint8Array {
    const header = readFileSync(templatePath, 'utf8').split(/\r?\n/)[0] ?? '';
    const headers = header.split(';').map(column => column.trim());
    columnOrder(headers, rows, templatePath);
    const lines = rows.map(row => headers.map(column => String(row[column] ?? '')).join(';'));
    return new TextEncoder().encode(`${[header, ...lines].join('\n')}\n`);
}

async function fillExcelTemplate(templatePath: string, rows: Rows): Promise<Uint8Array> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
        throw new Error(`Template ${templatePath} has no worksheet`);
    }
    const headers = (sheet.getRow(1).values as unknown[]).slice(1).map(value => String(value ?? '').trim());
    columnOrder(headers, rows, templatePath);
    if (sheet.rowCount > 1) {
        sheet.spliceRows(2, sheet.rowCount - 1);
    }
    for (const row of rows) {
        sheet.addRow(headers.map(column => row[column] ?? null));
    }
    return new Uint8Array(await workbook.xlsx.writeBuffer());
}
