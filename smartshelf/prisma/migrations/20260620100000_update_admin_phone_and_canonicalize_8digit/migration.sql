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
-- If both old and new super admin users exist, merge references into the new user and delete the old.
-- If only the old user exists, rename it.
-- If only the new user exists, nothing to do.
DO $$
DECLARE
  old_user_id TEXT;
  new_user_id TEXT;
BEGIN
  SELECT id INTO old_user_id FROM "User" WHERE "phone" = '23276000000' AND "role" = 'super_admin';
  SELECT id INTO new_user_id FROM "User" WHERE "phone" = '23231569311' AND "role" = 'super_admin';

  IF old_user_id IS NOT NULL THEN
    IF new_user_id IS NOT NULL THEN
      -- Merge references to the new super admin so nothing is orphaned.
      UPDATE "Medicine" SET "userId" = new_user_id WHERE "userId" = old_user_id;
      UPDATE "Sale" SET "userId" = new_user_id WHERE "userId" = old_user_id;
      UPDATE "Guideline" SET "userId" = new_user_id WHERE "userId" = old_user_id;
      UPDATE "User" SET "createdBy" = new_user_id WHERE "createdBy" = old_user_id;
      DELETE FROM "User" WHERE id = old_user_id;
    ELSE
      UPDATE "User" SET "phone" = '23231569311' WHERE id = old_user_id;
    END IF;
  END IF;
END $$;
