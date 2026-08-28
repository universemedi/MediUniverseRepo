-- MediUnivers — GST on Clinic consultation fees.
-- Pharmacy (Medicine.tax_percent, overridable per sale line) and Laboratory
-- (LabTest.tax_percent) already had configurable GST as of V6; Clinic
-- consultation billing was still untaxed. This closes that gap so all three
-- billed modules go through the same configurable-GST path before an
-- invoice — and therefore a payment gateway charge — is ever created.
alter table doctors add column tax_percent numeric(5,2) not null default 0;
