-- Convert existing phone numbers to canonical Sierra Leone format (232XXXXXXXXX).
-- Handles local formats (076... -> 23276...), bare 9-digit numbers (76... -> 23276...),
-- and already-canonical numbers pass through unchanged.
UPDATE "User"
SET "phone" = CASE
  WHEN "phone" ~ '^00' THEN regexp_replace("phone", '^00', '')
  WHEN "phone" ~ '^0' AND length("phone") = 10 THEN '232' || substring("phone" from 2)
  WHEN "phone" !~ '^232' AND length("phone") = 9 THEN '232' || "phone"
  ELSE "phone"
END
WHERE "phone" !~ '^232' OR length("phone") NOT IN (9, 10, 11, 12);

UPDATE "Otp"
SET "phone" = CASE
  WHEN "phone" ~ '^00' THEN regexp_replace("phone", '^00', '')
  WHEN "phone" ~ '^0' AND length("phone") = 10 THEN '232' || substring("phone" from 2)
  WHEN "phone" !~ '^232' AND length("phone") = 9 THEN '232' || "phone"
  ELSE "phone"
END
WHERE "phone" !~ '^232' OR length("phone") NOT IN (9, 10, 11, 12);
