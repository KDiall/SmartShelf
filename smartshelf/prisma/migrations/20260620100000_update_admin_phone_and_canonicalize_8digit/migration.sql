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

-- Handle super admin phone change carefully.
-- If a user with the target admin phone exists, make that user the super admin and merge old super admin data into it.
-- If only the old super admin exists, rename it to the target phone.
DO $$
DECLARE
  old_admin_id TEXT;
  target_user_id TEXT;
BEGIN
  SELECT id INTO old_admin_id FROM "User" WHERE "phone" = '23276000000' AND "role" = 'super_admin';
  SELECT id INTO target_user_id FROM "User" WHERE "phone" = '23231569311';

  IF old_admin_id IS NOT NULL THEN
    IF target_user_id IS NOT NULL THEN
      -- Make the target user the super admin and merge old super admin references into it.
      UPDATE "User" SET "role" = 'super_admin', "pharmacyId" = NULL WHERE id = target_user_id;
      UPDATE "Medicine" SET "userId" = target_user_id WHERE "userId" = old_admin_id;
      UPDATE "Sale" SET "userId" = target_user_id WHERE "userId" = old_admin_id;
      UPDATE "Guideline" SET "userId" = target_user_id WHERE "userId" = old_admin_id;
      UPDATE "User" SET "createdBy" = target_user_id WHERE "createdBy" = old_admin_id;
      DELETE FROM "User" WHERE id = old_admin_id;
    ELSE
      UPDATE "User" SET "phone" = '23231569311' WHERE id = old_admin_id;
    END IF;
  END IF;
END $$;
