alter table prescription_items add column medicine_id bigint references medicines(id);
alter table consultations add column prescription_number varchar(30);
