insert into storage.buckets (id, name, public, file_size_limit)
values ('exams', 'exams', false, 26214400);

create policy "Teachers upload own PDFs"
  on storage.objects for insert
  with check (bucket_id = 'exams' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Teachers read own PDFs"
  on storage.objects for select
  using (bucket_id = 'exams' and auth.uid()::text = (storage.foldername(name))[1]);
