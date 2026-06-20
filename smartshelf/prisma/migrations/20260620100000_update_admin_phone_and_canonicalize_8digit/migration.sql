-- Update the seeded platform super admin phone to the new admin number.
UPDATE "User"
SET "phone" = '23231569311'
WHERE "phone" = '23276000000'
  AND "role" = 'super_admin';

-- Update the seeded demo pharmacy phone to the new admin number.
UPDATE "Pharmacy"
SET "phone" = '+23231569311'
WHERE "phone" = '+23276000000'
  AND "name" = 'Main Branch';

-- Canonicalize any bare 8-digit Sierra Leone subscriber numbers that were missed.
UPDATE "User"
SET "phone" = '232' || "phone"
WHERE "phone" !~ '^232' AND length("phone") = 8;

UPDATE "Otp"
SET "phone" = '232' || "phone"
WHERE "phone" !~ '^232' AND length("phone") = 8;
