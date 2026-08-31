-- Optional availability window for a plan — new signups can only pick it between
-- valid_from and valid_to (both nullable = always available), mirroring coupons.valid_from/valid_to.
alter table plans add column valid_from date;
alter table plans add column valid_to date;
