-- Admin-issued practice credits.
--
-- Replaces hand-written SQL for the "my friend needs more credits" case. Doing
-- it by hand means remembering three things that must stay in step: the
-- balance, the practice_credits marker, and a ledger row carrying the resulting
-- balance_after. Miss the second and you've minted withdrawable money; miss the
-- third and the ledger stops reconciling. This does all three in one
-- transaction, or none of them.
--
-- Grants are always practice credits. An admin grant is not purchased money,
-- so it must never become withdrawable.

create or replace function public.admin_grant_credits(
  p_user_id uuid,
  p_amount numeric,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance numeric;
  v_actor uuid := auth.uid();
  c_max constant numeric := 10000;   -- fat-finger guard, not a policy limit
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Grant amount must be greater than zero';
  end if;
  if p_amount > c_max then
    raise exception 'Grant amount % exceeds the per-grant limit of %',
      round(p_amount, 2), c_max;
  end if;

  update balances
     set balance = balance + p_amount,
         practice_credits = practice_credits + p_amount
   where user_id::text = p_user_id::text
  returning balance into v_new_balance;

  if v_new_balance is null then
    raise exception 'That account has no balance row';
  end if;

  -- ref records which admin issued it, so grants are traceable in the ledger.
  insert into ledger (user_id, type, amount, ref, description, balance_after)
  values (
    p_user_id,
    'deposit',
    p_amount,
    'grant_' || coalesce(v_actor::text, 'unknown'),
    coalesce(nullif(btrim(p_note), ''), 'Practice credits granted by admin'),
    v_new_balance
  );

  return jsonb_build_object('balance', v_new_balance, 'granted', p_amount);
end;
$$;

revoke execute on function public.admin_grant_credits(uuid, numeric, text)
  from public, anon;
grant execute on function public.admin_grant_credits(uuid, numeric, text)
  to authenticated;
