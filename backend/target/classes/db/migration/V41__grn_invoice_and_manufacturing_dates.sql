alter table goods_receipts add column supplier_invoice_number varchar(60);
alter table goods_receipts add column supplier_invoice_date date;
alter table goods_receipt_items add column manufacturing_date date;
alter table batches add column manufacturing_date date;
