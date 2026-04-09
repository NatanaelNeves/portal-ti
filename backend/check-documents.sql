-- Verificar documentos e seus file_urls
SELECT 
  id,
  title,
  file_url,
  file_size,
  document_type,
  created_at
FROM documents
ORDER BY created_at DESC;

-- Verificar se o documento específico existe
SELECT 
  id,
  title,
  file_url,
  CASE 
    WHEN file_url IS NULL THEN 'SEM ARQUIVO'
    ELSE 'COM ARQUIVO'
  END as status
FROM documents
WHERE id = 'f3657198-d245-4c8c-9af2-e24b5ef0e0bb';
