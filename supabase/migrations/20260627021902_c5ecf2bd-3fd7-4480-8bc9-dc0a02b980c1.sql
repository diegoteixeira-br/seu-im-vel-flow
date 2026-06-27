
-- Trigger-only functions: revoke from everyone
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_promote_admin() FROM PUBLIC, anon, authenticated;

-- User-callable definer fns: revoke from anon/public, keep for authenticated (self-guard inside)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_plan_limit(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_plan_limit(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

-- Admin functions: revoke from anon/public; authenticated stays because they self-check has_role('admin')
REVOKE EXECUTE ON FUNCTION public.admin_update_user_plan(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_user_active(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_toggle_admin(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_dashboard_metrics() FROM PUBLIC, anon;
