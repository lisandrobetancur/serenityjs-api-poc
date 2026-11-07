import { type DataTable } from '@cucumber/cucumber';
import { type Actor } from '@serenity-js/core';

import { Buckets, DynamoTables, LambdaFunctions } from '../../src/utils/aws/ResourceNames';
import { AwsSteps } from '../steps/AwsSteps';
import { parseLiteral } from '../support/values';
import { given, then, when } from './define';

const rows = (table: DataTable) =>
    table
        .hashes()
        .map(row =>
            Object.fromEntries(
                Object.entries(row).map(([key, value]) => [key, parseLiteral(value) as string | number]),
            ),
        );

given(
    '{actor} has saved the config flag {string} with the value {string}',
    (actor: Actor, key: string, value: string) => AwsSteps.saveConfigItem(actor, DynamoTables.APP_CONFIG(), key, value),
);

when('{actor} expires the config flag {string}', (actor: Actor, key: string) =>
    AwsSteps.expireConfigItem(actor, DynamoTables.APP_CONFIG(), key),
);

when('{actor} uploads these orders as {string} from the CSV template:', (actor: Actor, key: string, table: DataTable) =>
    AwsSteps.uploadCsvFromTemplate(actor, Buckets.FILES(), key, rows(table)),
);

when(
    '{actor} uploads these orders as {string} from the Excel template:',
    (actor: Actor, key: string, table: DataTable) =>
        AwsSteps.uploadExcelFromTemplate(actor, Buckets.FILES(), key, rows(table)),
);

then('{actor} deletes the file {string}', (actor: Actor, key: string) =>
    AwsSteps.deleteFile(actor, Buckets.FILES(), key),
);

when('{actor} invokes the order confirmation Lambda', (actor: Actor) =>
    AwsSteps.invokeLambda(actor, LambdaFunctions.CONFIRM_ORDERS(), { orders: ['ACME-0001'] }),
);

when('{actor} invokes the order confirmation Lambda asking it to fail', (actor: Actor) =>
    AwsSteps.invokeLambdaExpectingFailure(actor, LambdaFunctions.CONFIRM_ORDERS(), { fail: true }),
);

then('{actor} should see the config flag {string} set to {string}', (actor: Actor, key: string, value: string) =>
    AwsSteps.configItemIs(actor, DynamoTables.APP_CONFIG(), key, value),
);
