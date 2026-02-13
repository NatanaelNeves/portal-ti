-- Script para corrigir encoding UTF-8 em tickets existentes
-- Execute este script no PostgreSQL se ainda houver problemas de encoding

-- 1. Verificar encoding do banco
SHOW client_encoding;
SHOW server_encoding;

-- 2. Corrigir títulos de tickets com problemas comuns
UPDATE tickets
SET title = REPLACE(title, '�o', 'ão')
WHERE title LIKE '%�o%';

UPDATE tickets
SET title = REPLACE(title, '�', 'ã')
WHERE title LIKE '%�%';

UPDATE tickets
SET title = REPLACE(title, 'n�o', 'não')
WHERE title LIKE '%n�o%';

UPDATE tickets
SET title = REPLACE(title, 'est�', 'está')
WHERE title LIKE '%est�%';

UPDATE tickets
SET title = REPLACE(title, 'descri��o', 'descrição')
WHERE title LIKE '%descri��o%';

UPDATE tickets
SET title = REPLACE(title, 'informa��o', 'informação')
WHERE title LIKE '%informa��o%';

-- 3. Corrigir descrições
UPDATE tickets
SET description = REPLACE(description, '�o', 'ão')
WHERE description LIKE '%�o%';

UPDATE tickets
SET description = REPLACE(description, '�', 'ã')
WHERE description LIKE '%�%';

UPDATE tickets
SET description = REPLACE(description, 'n�o', 'não')
WHERE description LIKE '%n�o%';

UPDATE tickets
SET description = REPLACE(description, 'est�', 'está')
WHERE description LIKE '%est�%';

-- 4. Verificar se há tickets afetados
SELECT id, title, description
FROM tickets
WHERE title LIKE '%�%' OR description LIKE '%�%'
LIMIT 10;

-- 5. Se necessário, reconverter o encoding do banco (USE COM CUIDADO!)
-- ALTER DATABASE portal_ti SET client_encoding = 'UTF8';
