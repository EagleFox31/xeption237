-- ============================================================================
-- 20261023_004_order_created_notification_trigger.sql
-- Déclenche une notification admin_notifications lors de la création d'une
-- nouvelle commande en ligne (exclut les ventes comptoir pos_sale).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_order_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si la commande a été passée par un vendeur au comptoir (staff_id renseigné ou delivery_mode 'pos'),
  -- elle fait l'objet d'une notification 'pos_sale' distincte.
  IF NEW.staff_id IS NOT NULL OR NEW.delivery_mode = 'pos' THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.admin_notifications (
      dedup_key,
      event_type,
      title,
      message,
      link_to_tab,
      link_to_id,
      created_by
    ) VALUES (
      format('order.created.%s', NEW.id),
      'order_created',
      'Nouvelle commande en ligne',
      concat_ws(' — ',
        format('%s FCFA', trim(to_char(coalesce(NEW.total, 0), 'FM999G999G999'))),
        coalesce(nullif(NEW.customer_city, ''), 'Cameroun'),
        coalesce(nullif(NEW.delivery_mode, ''), 'Livraison')
      ),
      'orders',
      NEW.id,
      'trigger'
    )
    ON CONFLICT (dedup_key) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_order_created: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_order_created() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_order_created ON public.orders;
CREATE TRIGGER trg_notify_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_created();
