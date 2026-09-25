create policy "Approved drivers can view available orders"
on public.orders for select
to authenticated
using (
  driver_id = auth.uid()
  or (
    driver_id is null
    and status in ('paid', 'preparing', 'ready')
    and exists (
      select 1
      from public.driver_profiles dp
      where dp.id = auth.uid()
        and dp.approval_status = 'approved'
    )
  )
);

drop policy if exists "Authenticated partners can upload food images" on storage.objects;
create policy "Authenticated partners can upload food images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'food-images'
  and (
    public.current_user_role() in ('owner', 'admin')
    or exists (
      select 1
      from public.restaurants r
      where r.owner_id = auth.uid()
    )
  )
);

drop policy if exists "Authenticated partners can update food images" on storage.objects;
create policy "Authenticated partners can update food images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'food-images'
  and (
    public.current_user_role() in ('owner', 'admin')
    or exists (
      select 1
      from public.restaurants r
      where r.owner_id = auth.uid()
    )
  )
);

drop policy if exists "Authenticated partners can delete food images" on storage.objects;
create policy "Authenticated partners can delete food images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'food-images'
  and (
    public.current_user_role() in ('owner', 'admin')
    or exists (
      select 1
      from public.restaurants r
      where r.owner_id = auth.uid()
    )
  )
);
