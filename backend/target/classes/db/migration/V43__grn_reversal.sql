alter table goods_receipts add column status varchar(20) not null default 'RECEIVED';
alter table goods_receipt_items add column batch_id bigint references batches(id);
