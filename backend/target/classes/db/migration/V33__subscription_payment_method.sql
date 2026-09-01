-- How a directly-sold (non-online-gateway) subscription was actually paid for —
-- cash, bank transfer, UPI, cheque — recorded by whichever platform staff
-- member closed the deal. Plain string, same convention as the provider
-- columns elsewhere, so a new method never needs a migration of its own.
alter table subscriptions add column payment_method varchar(20);
