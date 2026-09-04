alter table stock_ledger_entries add column note varchar(300);
alter table stock_ledger_entries add column created_by bigint references app_users(id);
