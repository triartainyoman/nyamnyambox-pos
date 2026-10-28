-- ============================================================================
-- Nyamnyambox POS — hidden DEVELOPER role (enum value only)
--
-- `ALTER TYPE ... ADD VALUE` cannot be used by the same transaction that adds
-- it, so the new enum value lives in its own migration. Helpers, policies and
-- the profile trigger that depend on it are in 0008.
-- ============================================================================

alter type public.user_role add value if not exists 'DEVELOPER';
