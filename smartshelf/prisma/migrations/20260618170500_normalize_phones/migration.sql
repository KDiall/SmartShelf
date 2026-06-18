-- Normalize existing phone numbers to digits-only so OTP send/verify lookups
-- (which strip non-digits) match the stored values and existing accounts can log in.
UPDATE "User" SET "phone" = regexp_replace("phone", '[^0-9]', '', 'g') WHERE "phone" ~ '[^0-9]';
UPDATE "Otp" SET "phone" = regexp_replace("phone", '[^0-9]', '', 'g') WHERE "phone" ~ '[^0-9]';
