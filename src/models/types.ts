import type { components } from './schema';

/**
 * Friendly aliases for the schemas generated from the Prop Room API OpenAPI contract.
 * Regenerate `schema.d.ts` with `npm run generate:types` whenever the contract changes.
 */
type Schemas = components['schemas'];

export type UserRole = Schemas['UserRole'];
export type TokenPair = Schemas['TokenPair'];
export type UserOut = Schemas['UserOut'];
export type ProductCreate = Schemas['ProductCreate'];
export type ProductUpdate = Schemas['ProductUpdate'];
export type ProductOut = Schemas['ProductOut'];
export type CategoryIn = Schemas['CategoryIn'];
export type SupplierIn = Schemas['SupplierIn'];
export type SupplierUpdate = Schemas['SupplierUpdate'];
export type WarehouseIn = Schemas['WarehouseIn'];
export type WarehouseUpdate = Schemas['WarehouseUpdate'];
export type StockAdjustment = Schemas['StockAdjustment'];
export type StockIn = Schemas['StockIn'];
export type StockOut = Schemas['StockOut'];
export type StockTransfer = Schemas['StockTransfer'];
export type MovementRequest = StockIn | StockOut | StockTransfer;
export type PurchaseOrderCreate = Schemas['PurchaseOrderCreate'];
export type PurchaseOrderUpdate = Schemas['PurchaseOrderUpdate'];
export type PurchaseOrderLineIn = Schemas['PurchaseOrderLineIn'];
export type ReportRequest = Schemas['ReportRequest'];
export type JobOut = Schemas['JobOut'];
