-- Migration 013: Add department and unit to public_users
-- Adiciona campos de setor e unidade para usuários públicos

-- Adicionar coluna department
ALTER TABLE public_users 
ADD COLUMN IF NOT EXISTS department VARCHAR(255);

-- Adicionar coluna unit
ALTER TABLE public_users 
ADD COLUMN IF NOT EXISTS unit VARCHAR(255);

-- Comentários para documentação
COMMENT ON COLUMN public_users.department IS 'Setor/Departamento do usuário (ex: Educação, Saúde)';
COMMENT ON COLUMN public_users.unit IS 'Unidade de trabalho do usuário (ex: CAPS, Escola X)';
