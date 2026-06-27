
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
CREATE INDEX IF NOT EXISTS posts_scheduled_at_idx ON public.posts(scheduled_at) WHERE published = false AND scheduled_at IS NOT NULL;

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.publish_scheduled_posts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.posts
     SET published = true,
         scheduled_at = NULL,
         updated_at = now()
   WHERE published = false
     AND scheduled_at IS NOT NULL
     AND scheduled_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.publish_scheduled_posts() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'publish-scheduled-posts') THEN
    PERFORM cron.schedule('publish-scheduled-posts', '* * * * *', $cron$SELECT public.publish_scheduled_posts();$cron$);
  END IF;
END $$;
