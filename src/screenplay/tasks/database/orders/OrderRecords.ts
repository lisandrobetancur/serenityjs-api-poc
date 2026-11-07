import { OrdersTable } from '../../../../entities/orders';
import { UpdateRecord } from '../../../interactions/database/RecordWrites';

/**
 * Example database task. It never builds a partial row: `UpdateRecord` reads the current row, computes the diff
 * and writes only the columns that changed.
 */
export const ExpireRecord = {
    withTheRecord: (orderId: string) =>
        UpdateRecord.of(OrdersTable, orderId, { status: 'expired', expires_at: new Date(Date.now() - 60_000) }),
};

export const AnnotateRecord = {
    withTheRecord: (orderId: string, notes: string | null) => UpdateRecord.of(OrdersTable, orderId, { notes }),
};
