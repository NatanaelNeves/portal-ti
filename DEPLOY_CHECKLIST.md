# ✅ Checklist Pré-Deploy

## 📋 Configuração Inicial

### Backend (.env)
```bash
- [ ] NODE_ENV=production
- [ ] PORT=3001
- [ ] DB_HOST=<seu-servidor-postgres>
- [ ] DB_PORT=5432
- [ ] DB_NAME=portal_ti
- [ ] DB_USER=<usuario-seguro>
- [ ] DB_PASSWORD=<senha-forte-aqui>
- [ ] JWT_SECRET=<minimo-32-caracteres-aleatorios>
- [ ] JWT_REFRESH_SECRET=<outro-secret-diferente>
- [ ] JWT_EXPIRES_IN=15m
- [ ] JWT_REFRESH_EXPIRES_IN=7d
- [ ] CORS_ORIGIN=https://seu-dominio.com
- [ ] SMTP_HOST=<servidor-smtp>
- [ ] SMTP_PORT=587
- [ ] SMTP_USER=<email-sistema>
- [ ] SMTP_PASSWORD=<senha-email>
```

### Frontend (.env.production)
```bash
- [ ] VITE_API_URL=https://api.seu-dominio.com
```

---

## 🔐 Segurança

### Obrigatório
- [ ] Alterar TODAS as senhas padrão
- [ ] JWT_SECRET com 32+ caracteres aleatórios
- [ ] Usar HTTPS (SSL/TLS)
- [ ] Configurar CORS corretamente
- [ ] Desabilitar DEBUG em produção

### Recomendado
- [ ] Implementar rate limiting
- [ ] Adicionar Helmet.js
- [ ] Configurar CSRF protection
- [ ] Validação server-side completa
- [ ] Firewall no servidor

---

## 💾 Banco de Dados

### Preparação
- [ ] PostgreSQL 12+ instalado
- [ ] Banco `portal_ti` criado
- [ ] Usuário com permissões adequadas
- [ ] Executar todas as migrations (001-014)
- [ ] Testar conexão

### Backup
- [ ] Configurar cron para backup diário
- [ ] Testar restore de backup
- [ ] Backup em local separado

Exemplo de cron (diário às 2h):
```bash
0 2 * * * pg_dump -U postgres portal_ti > /backups/portal_ti_$(date +\%Y\%m\%d).sql
```

---

## 🚀 Deploy

### Opção 1: Docker (Recomendado)

1. **Criar arquivos Docker:**
```bash
- [ ] Dockerfile (backend)
- [ ] Dockerfile (frontend)
- [ ] docker-compose.yml
- [ ] .dockerignore
```

2. **Build e Deploy:**
```bash
docker-compose build
docker-compose up -d
```

### Opção 2: Manual

**Backend:**
```bash
cd backend
npm install --production
npm run build
pm2 start dist/index.js --name portal-ti-backend
```

**Frontend:**
```bash
cd frontend
npm install
npm run build
# Copiar pasta dist/ para nginx/apache
```

---

## 🌐 Servidor Web

### Nginx (Recomendado)

**Backend (Reverse Proxy):**
```nginx
server {
    listen 443 ssl;
    server_name api.seu-dominio.com;

    ssl_certificate /etc/ssl/cert.pem;
    ssl_certificate_key /etc/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Frontend (Static Files):**
```nginx
server {
    listen 443 ssl;
    server_name seu-dominio.com;

    ssl_certificate /etc/ssl/cert.pem;
    ssl_certificate_key /etc/ssl/key.pem;

    root /var/www/portal-ti/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🔑 SSL/TLS (HTTPS)

### Let's Encrypt (Gratuito)
```bash
- [ ] Instalar certbot
- [ ] Obter certificado: certbot --nginx -d seu-dominio.com
- [ ] Auto-renovação configurada
```

Teste auto-renovação:
```bash
certbot renew --dry-run
```

---

## 📊 Monitoramento

### Logs
```bash
- [ ] Configurar rotação de logs
- [ ] Monitorar logs de erro
- [ ] Alertas para erros críticos
```

**PM2 Logs:**
```bash
pm2 logs portal-ti-backend
pm2 monit
```

### Health Checks
```bash
- [ ] Endpoint /api/health ativo
- [ ] Monitoramento de uptime (UptimeRobot, Pingdom)
- [ ] Alertas via email/SMS
```

### Performance
```bash
- [ ] Monitorar uso de CPU/RAM
- [ ] Monitorar queries lentas no PostgreSQL
- [ ] Limite de conexões do banco
```

---

## 📦 Dados Iniciais

### Importar Dados
```bash
cd backend

- [ ] Importar usuários:
node scripts/import-users.js data/usuarios-exemplo.csv

- [ ] Importar equipamentos:
node scripts/import-equipment.js data/equipamentos-exemplo.csv
```

### Criar Admin Inicial
```bash
- [ ] Criar usuário admin via script ou SQL
- [ ] Testar login
- [ ] Trocar senha padrão
```

---

## 🧪 Testes Pós-Deploy

### Funcionalidade
- [ ] Login funciona
- [ ] Criar chamado funciona
- [ ] Upload de arquivo funciona
- [ ] WebSocket conecta
- [ ] Emails são enviados
- [ ] Dashboard carrega gráficos
- [ ] Exportação Excel funciona

### Performance
- [ ] Tempo de carregamento < 3s
- [ ] API responde em < 500ms
- [ ] WebSocket reconecta automaticamente

### Segurança
- [ ] HTTPS ativo em todo site
- [ ] CORS configurado corretamente
- [ ] No console errors no navegador
- [ ] Headers de segurança presentes

---

## 👥 Treinamento

### Equipe TI
- [ ] Tutorial de uso do sistema
- [ ] Conhecer todas as funcionalidades
- [ ] Saber onde encontrar logs
- [ ] Procedimento de backup/restore

### Usuários Finais
- [ ] Como abrir chamado
- [ ] Como acompanhar chamado
- [ ] FAQ básico

---

## 📱 Comunicação

### Lançamento
- [ ] Anunciar data de lançamento
- [ ] Email para todos os usuários
- [ ] FAQ disponível
- [ ] Canal de suporte definido

---

## 🚨 Rollback Plan

### Em caso de problemas:
```bash
1. [ ] Manter backup do banco anterior
2. [ ] Manter versão anterior em standby
3. [ ] Documentar procedimento de rollback
4. [ ] Testar rollback em homologação
```

**Rollback Rápido:**
```bash
# Restaurar banco
psql -U postgres portal_ti < backup_anterior.sql

# Reverter código
git checkout <commit-anterior>
pm2 restart portal-ti-backend
```

---

## ✅ Checklist Final

### Antes de ir ao ar:
- [ ] Todos os itens acima verificados
- [ ] Backup funcional testado
- [ ] HTTPS configurado
- [ ] Logs funcionando
- [ ] Monitoramento ativo
- [ ] Equipe treinada
- [ ] Rollback plan testado
- [ ] DNS configurado corretamente
- [ ] Email de lançamento pronto

### Dia do Lançamento:
- [ ] Verificar logs em tempo real
- [ ] Monitorar performance
- [ ] Estar disponível para suporte
- [ ] Comunicar aos usuários

### Pós-Lançamento:
- [ ] Monitorar primeiros 3 dias intensivamente
- [ ] Coletar feedback dos usuários
- [ ] Corrigir bugs críticos imediatamente
- [ ] Atualizar FAQ conforme dúvidas

---

## 📞 Contatos de Emergência

```
Desenvolvedor: _______________
DBA: _______________
Sysadmin: _______________
Suporte: _______________
```

---

## 📝 Observações

- **Homologação Primeiro**: Sempre teste em ambiente de homologação
- **Horário**: Lançar fora do horário de pico
- **Comunicação**: Avisar usuários com antecedência
- **Paciência**: Primeiros dias podem ter ajustes

---

**Última atualização**: 19/02/2026  
**Status**: ✅ Pronto para deploy quando completar checklist
