# 📥 Scripts de Importação de Dados

Scripts para importar dados iniciais no Portal de Serviços Internos.

## 📋 Pré-requisitos

- Node.js instalado
- Banco de dados PostgreSQL configurado
- Arquivo `.env` configurado no backend

## 👥 Importar Usuários

### Formato do CSV

Arquivo CSV com as seguintes colunas:

```csv
email,name,role,password
usuario@empresa.com,João Silva,it_staff,senha123
```

**Colunas:**
- `email`: E-mail do usuário (único, obrigatório)
- `name`: Nome completo (obrigatório)
- `role`: Papel no sistema (obrigatório)
  - `admin`: Administrador
  - `it_staff`: Equipe de TI
  - `manager`: Coordenador/Gestor
- `password`: Senha inicial (obrigatório, será criptografada)

### Como usar

```bash
cd backend
node scripts/import-users.js data/usuarios-exemplo.csv
```

### Resultado esperado

```
📁 5 usuários encontrados no CSV
✅ Importado: Equipe TI (ti@pequeno-nazareno.org) - it_staff
✅ Importado: Maria Coordenadora (coordenador@pequeno-nazareno.org) - manager
⚠️  Usuário já existe: admin@pequeno-nazareno.org

📊 Resumo da Importação:
   ✅ Importados: 4
   ⚠️  Pulados: 1
   ❌ Erros: 0
```

---

## 💻 Importar Equipamentos

### Formato do CSV

```csv
code,type,brand,model,serial_number,processor,ram,storage,status,location,notes
NB-001,notebook,Dell,Latitude 5420,ABC123,Intel i5,16GB,512GB SSD,available,TI,Novo
```

**Colunas:**
- `code`: Código do equipamento (único, obrigatório) - Ex: NB-001, DT-001
- `type`: Tipo do equipamento (obrigatório)
  - `notebook`, `desktop`, `monitor`, `mouse`, `keyboard`, `printer`, `other`
- `brand`: Marca (opcional) - Ex: Dell, HP, Lenovo
- `model`: Modelo (opcional) - Ex: Latitude 5420
- `serial_number`: Número de série (opcional)
- `processor`: Processador (opcional) - Ex: Intel i5 11th Gen
- `ram`: Memória RAM (opcional) - Ex: 16GB
- `storage`: Armazenamento (opcional) - Ex: 512GB SSD
- `status`: Status atual (opcional, padrão: available)
  - `available`: Disponível
  - `in_use`: Em uso
  - `maintenance`: Em manutenção
  - `retired`: Baixado
- `location`: Localização (opcional) - Ex: TI, Administrativo
- `notes`: Observações (opcional)

### Como usar

```bash
cd backend
node scripts/import-equipment.js data/equipamentos-exemplo.csv
```

### Resultado esperado

```
📁 10 equipamentos encontrados no CSV
✅ Importado: NB-001 - notebook Dell Latitude 5420
✅ Importado: NB-002 - notebook Lenovo ThinkPad E14
✅ Importado: DT-001 - desktop Dell OptiPlex 3080
⚠️  Equipamento já existe: MN-001

📊 Resumo da Importação:
   ✅ Importados: 9
   ⚠️  Pulados: 1
   ❌ Erros: 0
```

---

## 🚨 Notas Importantes

### Segurança
- **Senhas**: As senhas no CSV são temporárias. Os usuários devem alterá-las no primeiro login.
- **Backup**: Sempre faça backup do banco antes de importar dados em produção.
- **Validação**: O script valida dados automaticamente e pula registros inválidos.

### Duplicatas
- O script **não sobrescreve** registros existentes.
- Se um email/código já existir, o registro será pulado.
- Para atualizar, delete o registro existente antes de importar.

### Logs
- `✅ Importado`: Registro criado com sucesso
- `⚠️ Pulado`: Registro já existe ou inválido
- `❌ Erro`: Falha ao processar registro

---

## 📝 Criando seu próprio CSV

### Excel/Google Sheets

1. Crie uma planilha com as colunas acima
2. Preencha os dados
3. Exporte como CSV (UTF-8, separado por vírgulas)
4. Execute o script de importação

### Exemplo mínimo de usuários

```csv
email,name,role,password
joao@empresa.com,João Silva,it_staff,senha123
maria@empresa.com,Maria Santos,manager,senha456
```

### Exemplo mínimo de equipamentos

```csv
code,type,brand,model,serial_number,processor,ram,storage,status,location,notes
NB-001,notebook,Dell,Latitude,SN123,,,,,TI,
DT-001,desktop,HP,EliteDesk,SN456,,,,,Admin,
```

---

## 🔧 Troubleshooting

### Erro: "Arquivo não encontrado"
- Verifique se o caminho do arquivo está correto
- Use caminho relativo à pasta `backend/`

### Erro: "Connection refused"
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no arquivo `.env`

### Erro: "Invalid role/type"
- Verifique os valores permitidos na documentação acima
- Valores são case-sensitive (minúsculas)

### Encoding de caracteres
- Salve sempre como UTF-8
- Evite caracteres especiais nos códigos

---

## 📊 Próximos Passos

Após importar os dados:

1. ✅ Faça login com um dos usuários importados
2. ✅ Verifique se os equipamentos aparecem no inventário
3. ✅ Peça aos usuários para trocar as senhas iniciais
4. ✅ Configure departamentos e localizações conforme necessário

---

**Dúvidas?** Consulte a documentação principal ou abra uma issue.
