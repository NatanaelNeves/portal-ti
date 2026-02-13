const { Client } = require('pg');

const faqArticles = [
  {
    title: 'Impressora com Atolamento de Papel - Como Resolver',
    category: 'Impressoras',
    content: `## Problema
Papel atola frequentemente na impressora, causando interrupções no trabalho.

## Solução Passo a Passo

### 1. Desligue a Impressora
- Pressione o botão Power para desligar
- Aguarde 30 segundos

### 2. Remova o Papel Atolado
- Abra a tampa frontal com cuidado
- Puxe o papel lentamente no sentido de saída
- NUNCA puxe o papel para trás
- Verifique se não ficaram pedaços dentro

### 3. Verifique a Bandeja
- Remova todos os papéis
- Verifique se não há papéis amassados ou dobrados
- Coloque apenas a quantidade recomendada (não ultrapassar o limite)

### 4. Ajuste as Guias
- Ajuste as guias laterais para ficarem justas ao papel
- Não muito apertadas, não muito soltas

### 5. Ligue e Teste
- Ligue a impressora novamente
- Faça uma impressão de teste

## Prevenção
- Use papel de boa qualidade
- Não ultrapasse a capacidade da bandeja
- Mantenha a impressora limpa
- Evite papel úmido ou amassado

## Quando Contatar TI
Se o problema persistir após 3 tentativas, abra um chamado para manutenção especializada.`
  },
  {
    title: 'Microsoft Teams - Sessão Expirada / Reset de Senha',
    category: 'Microsoft 365',
    content: `## Problema
Sua sessão do Microsoft Teams expirou ou você precisa redefinir a senha.

## Soluções

### Sessão Expirada
**Opção 1: Fazer Login Novamente**
1. Clique em "Entrar novamente"
2. Digite seu email institucional (@opequenonazareno.org.br)
3. Digite sua senha
4. Se solicitado, aprove no aplicativo Authenticator

**Opção 2: Reiniciar o Teams**
1. Feche completamente o Teams (bandeja do sistema)
2. Abra novamente
3. Faça login

### Reset de Senha
**Se você lembra a senha atual:**
1. Acesse https://myaccount.microsoft.com
2. Clique em "Segurança"
3. Clique em "Alterar senha"
4. Digite a senha atual e a nova senha (2x)

**Se esqueceu a senha:**
1. Na tela de login, clique em "Esqueci minha senha"
2. Digite seu email institucional
3. Escolha método de recuperação (email ou telefone)
4. Digite o código recebido
5. Crie uma nova senha

**Nova senha deve ter:**
- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 número
- Pelo menos 1 caractere especial (!, @, #, $, etc)

## Não Conseguiu Resolver?
Abra um chamado para a TI com as seguintes informações:
- Seu email institucional
- Mensagem de erro completa (tire um print)
- Se consegue acessar outros serviços Microsoft (Outlook, OneDrive)`
  },
  {
    title: 'OneDrive Não Sincronizando - Caminho Muito Longo',
    category: 'Microsoft 365',
    content: `## Problema
"O caminho do arquivo é muito longo" - Arquivos não sincronizam no OneDrive.

## Causa
O Windows tem limite de 260 caracteres para caminho completo do arquivo.

## Solução Rápida

### 1. Encurte Nomes de Pastas
**Antes:**
\`Documentos\\Relatórios Mensais\\2026\\Fevereiro\\Coordenação Pedagógica\\Relatório Completo de Atividades.docx\`

**Depois:**
\`Documentos\\Relatorios\\2026\\02\\Pedagogico\\Relatorio.docx\`

### 2. Mova para Pasta Principal
- Mova arquivos de pastas muito profundas para pastas mais próximas à raiz

### 3. Use Abreviações
- "Coordenação" → "Coord"
- "Relatório" → "Relat"
- "Desenvolvimento" → "Desenv"

## Solução Permanente
A TI pode habilitar suporte a caminhos longos no seu computador.

### Verificar se Sincronizou
1. Clique no ícone do OneDrive (nuvem) na bandeja
2. Veja se aparecem arquivos sincronizando
3. Ícone de check verde = sincronizado ✓

## Boas Práticas
- Mantenha estrutura de pastas simples (máximo 4 níveis)
- Use nomes curtos e descritivos
- Evite caracteres especiais nos nomes
- Não use espaços no início ou fim dos nomes

## Precisa de Ajuda?
Abra um chamado informando:
- Qual arquivo não sincroniza
- Caminho completo da pasta`
  },
  {
    title: 'Computador Lento - Limpeza e Otimização Básica',
    category: 'Hardware',
    content: `## Problema
Computador está lento, travando ou demorando para abrir programas.

## Soluções Rápidas (Você Pode Fazer)

### 1. Feche Programas Não Utilizados
- Pressione \`Ctrl + Shift + Esc\` para abrir Gerenciador de Tarefas
- Veja programas usando mais memória/CPU
- Clique com botão direito > Finalizar tarefa

### 2. Reinicie o Computador
- Feche todos os programas
- Menu Iniciar > Reiniciar
- Aguarde inicialização completa
- Lentidão temporária é normal nos primeiros 2 minutos

### 3. Libere Espaço em Disco
- Abra "Este Computador"
- Verifique espaço livre no disco C:
- Se tiver menos de 20GB livre:
  - Esvazie Lixeira
  - Delete arquivos temporários da pasta Downloads
  - Mova arquivos grandes para OneDrive

### 4. Atualize o Windows
- Configurações > Windows Update
- Clique em "Verificar atualizações"
- Instale e reinicie se necessário

## O Que a TI Vai Fazer

### Limpeza Avançada
- Remover programas não autorizados
- Limpar arquivos temporários do sistema
- Verificar e remover malware
- Atualizar drivers

### Manutenção de Hardware
- Limpeza física interna (pó)
- Aplicação de pasta térmica
- Verificação de HD/SSD
- Upgrade de memória (se necessário)

## Quando Contatar TI
- Computador trava constantemente
- Programas fecham sozinhos
- Tela azul (Blue Screen)
- Lentidão persiste após reiniciar
- Disco C: com menos de 10GB livre

## Prevenção
- Reinicie o computador pelo menos 1x por semana
- Não instale programas sem autorização
- Mantenha Windows Update ativado
- Use OneDrive para arquivos grandes`
  },
  {
    title: 'Impressora Fora da Rede - Não Encontra Impressora',
    category: 'Impressoras',
    content: `## Problema
Computador não encontra a impressora na rede.

## Soluções Rápidas

### 1. Verifique Conexões
**Na Impressora:**
- Verifique se está ligada (luz acesa)
- Verifique cabo de rede conectado (luz verde/laranja piscando)
- Se for WiFi, verifique ícone de rede na impressora

**No Computador:**
- Verifique se está conectado à rede do prédio
- Não deve estar em "Rede de Convidados"

### 2. Reinicie Impressora
1. Desligue a impressora (botão Power)
2. Retire o cabo de energia da tomada
3. Aguarde 30 segundos
4. Conecte novamente
5. Ligue a impressora
6. Aguarde 2 minutos para inicializar completamente

### 3. Reinstale a Impressora no PC
1. Painel de Controle > Dispositivos e Impressoras
2. Localize a impressora com problema
3. Clique com botão direito > "Remover dispositivo"
4. Clique em "Adicionar impressora"
5. Selecione a impressora que apareceu na lista
6. Clique em "Avançar" e aguarde instalação

### 4. Teste de Impressão
1. Clique com botão direito na impressora
2. "Imprimir página de teste"

## Impressoras Disponíveis por Setor

**Administrativo:** EPSON_ADM_01
**RH:** EPSON_RH_02  
**Financeiro:** HP_FIN_01
**VP (Vila Progresso):** CANON_VP_01
**DPI:** BROTHER_DPI_01

## Quando Contatar TI
- Impressora não aparece mesmo após reiniciar
- Luz vermelha piscando na impressora
- Computador não encontra NENHUMA impressora
- Mensagem "Driver indisponível"
- Precisa configurar nova impressora

## Informações para o Chamado
- Nome do seu computador (etiqueta)
- Qual impressora está tentando usar
- Mensagem de erro (tire um print)
- Se funcionava antes (quando parou?)`
  },
  {
    title: 'PDF Abrindo no Word - Como Configurar Programa Padrão',
    category: 'Configurações',
    content: `## Problema
Arquivos PDF abrem automaticamente no Microsoft Word ao invés do Adobe Reader.

## Solução Rápida

### Método 1: Clique com Botão Direito
1. Localize um arquivo PDF
2. Clique com botão direito no arquivo
3. Selecione "Abrir com"
4. Escolha "Adobe Acrobat Reader"
5. Marque "Sempre usar este aplicativo para abrir arquivos .pdf"
6. Clique em OK

### Método 2: Configurações do Windows
1. Clique com botão direito no arquivo PDF
2. Selecione "Propriedades"
3. Em "Abre com:", clique em "Alterar"
4. Selecione "Adobe Acrobat Reader"
5. Clique em OK
6. Clique em "Aplicar" e "OK"

### Método 3: Configurações do Sistema
1. Menu Iniciar > Configurações (ícone de engrenagem)
2. Clique em "Aplicativos"
3. Clique em "Aplicativos padrão"
4. Role até encontrar "Adobe Acrobat Reader"
5. Clique nele
6. Clique em ".pdf" na lista
7. Feche as configurações

## Por Que Isso Acontece?
O Windows 10/11 às vezes configura o Edge ou Word como padrão para PDFs após atualizações.

## Não Tem Adobe Reader?
Se o Adobe Reader não aparecer nas opções:
1. Abra um chamado para TI
2. Solicitaremos instalação do programa

## Outros Programas que Abrem PDF
- **Microsoft Edge** (navegador, básico)
- **Adobe Acrobat Reader** (recomendado, completo)
- **Chrome** (abre PDF mas não edita)

## Quando Usar Word para PDF?
O Word pode abrir PDFs quando você precisa **editar** o conteúdo. Mas para apenas **visualizar e imprimir**, use o Adobe Reader.`
  },
  {
    title: 'Como Criar Senha Forte e Segura',
    category: 'Segurança',
    content: `## Por Que Senhas Fortes São Importantes?
Senhas fracas são a principal porta de entrada para invasões e roubos de dados.

## Características de Uma Boa Senha

### Requisitos Mínimos
✅ Mínimo 8 caracteres (recomendado: 12+)
✅ Pelo menos 1 letra MAIÚSCULA
✅ Pelo menos 1 letra minúscula
✅ Pelo menos 1 número
✅ Pelo menos 1 caractere especial (!@#$%*&)

### Exemplos de Senhas Fortes
- \`P3qu3n0N@z@reno2026!\`
- \`S3nh@F0rt3!Trabalh0\`
- \`Meu$T@balh0#2026\`

### ❌ NUNCA Use
- Datas de nascimento: \`15031990\`
- Nomes próprios: \`maria123\`
- Sequências: \`123456\`, \`abcdef\`
- Palavras comuns: \`senha123\`, \`password\`
- Informações pessoais: nome+sobrenome

## Como Criar Senha Memorável

### Técnica da Frase
1. Pense em uma frase: "Eu trabalho no Pequeno Nazareno desde 2020"
2. Pegue primeiras letras: \`EtnPNd2020\`
3. Adicione caracteres especiais: \`EtnPN@2020!\`

### Técnica da Substituição
1. Palavra base: \`Pequeno\`
2. Substitua letras: \`P3qu3n0\`
3. Adicione complemento: \`P3qu3n0#2026\`

## Dicas de Segurança

### ✅ Boas Práticas
- Use senha diferente para cada sistema importante
- Anote em local seguro físico (não no computador)
- Troque senha a cada 90 dias
- Nunca compartilhe com colegas
- Use autenticação de dois fatores quando disponível

### ❌ Não Faça
- Salvar em arquivo de texto no desktop
- Deixar anotado em post-it no monitor
- Enviar por email ou WhatsApp
- Usar mesma senha em tudo
- Deixar navegador salvar senhas do trabalho

## Esqueceu a Senha?

### Microsoft 365 / Outlook / Teams
1. https://myaccount.microsoft.com
2. "Esqueci minha senha"
3. Use email de recuperação ou telefone

### Sistemas Internos (Fortes, ERP)
1. Abra chamado para TI
2. Informe: usuário e sistema
3. TI fará reset em até 2 horas

## Troca Periódica de Senha
O sistema pede troca de senha a cada 90 dias por segurança. Quando aparecer aviso:
1. Não ignore
2. Siga as dicas acima para criar nova senha
3. Não reutilize senhas antigas

## Suspeita de Invasão?
Se achar que alguém descobriu sua senha:
1. **Mude IMEDIATAMENTE**
2. Abra chamado URGENTE para TI
3. Informe o que aconteceu`
  },
  {
    title: 'Headset / Fone Sem Sair Som',
    category: 'Hardware',
    content: `## Problema
O fone de ouvido ou headset não está emitindo som no computador.

## Verificações Rápidas

### 1. Conexões Físicas
✅ Verifique se o cabo está conectado completamente
✅ Conectores P2 (3.5mm): empurre até sentir "clique"
✅ USB: teste em outra porta USB
✅ Se for sem fio: verifique se está pareado e com bateria

### 2. Volume do Windows
1. Clique no ícone de volume (canto inferior direito)
2. Verifique se o volume está acima de 50%
3. Clique em "Abrir configurações de som"
4. Em "Dispositivo de saída", selecione o headset correto
5. Clique em "Testar" para verificar

### 3. Configurações de Som Avançadas
1. Clique com botão direito no ícone de volume
2. "Configurações de som"
3. Role até "Configurações relacionadas"
4. Clique em "Painel de controle de som"
5. Aba "Reprodução"
6. Clique no seu headset
7. Botão "Definir como padrão"
8. Botão "Aplicar" e "OK"

### 4. Teste em Outro Dispositivo
- Conecte o headset no celular
- Se funcionar: problema no computador
- Se não funcionar: problema no headset

## Problemas Específicos

### Microsoft Teams
1. No Teams, clique na foto de perfil
2. Configurações > Dispositivos
3. Em "Dispositivos de áudio":
   - Alto-falante: selecione o headset
   - Microfone: selecione o headset
4. Clique em "Fazer uma chamada de teste"

### Apenas Um Lado Funciona
- Verifique se cabo não está torcido
- Teste no celular para confirmar defeito
- Se confirmado: solicite substituição à TI

### Som Muito Baixo
1. Aumentar volume do Windows (100%)
2. Aumentar volume do aplicativo (Teams, player, etc)
3. Verificar configuração "Aprimoramentos de áudio"
   - Painel de Som > Propriedades do dispositivo
   - Aba "Aprimoramentos"
   - Desmarque "Desabilitar todos"
   - Marque "Amplificação"

## Quando Contatar TI
- Não sai som mesmo após verificações
- Headset testado em outro PC funciona
- Driver aparece com "!" amarelo no Gerenciador
- Som sai pelos alto-falantes mesmo com fone conectado
- Precisa de headset novo (defeito confirmado)

## Informações para Chamado
- Modelo do headset
- Tipo de conexão (P2, USB, sem fio)
- Funciona em outro dispositivo?
- Problema começou após atualização/instalação?`
  },
  {
    title: 'Arquivo Não Baixa ou Baixa Corrompido',
    category: 'Configurações',
    content: `## Problema
Arquivos não baixam, baixam incompletos ou abrem com erro.

## Causas Comuns
- Navegador bloqueou download por segurança
- Antivírus bloqueou arquivo
- Conexão instável interrompeu download
- Espaço insuficiente no disco
- Arquivo original corrompido

## Soluções

### 1. Verifique Bloqueio do Navegador
**Chrome/Edge:**
1. Procure mensagem "Bloqueado" no final da tela
2. Clique na seta ao lado do arquivo
3. "Manter" ou "Fazer download assim mesmo"

**Firefox:**
1. Menu > Downloads
2. Procure arquivo com ícone de alerta
3. Clique em "Tentar novamente"

### 2. Limpe Cache e Tente Novamente
**Chrome:**
- Pressione \`Ctrl + Shift + Del\`
- Selecione "Todo o período"
- Marque "Imagens e arquivos em cache"
- Clique em "Limpar dados"
- Tente baixar novamente

**Edge:**
- Pressione \`Ctrl + Shift + Del\`
- "Todo o período"
- "Imagens e arquivos armazenados em cache"
- "Limpar agora"

### 3. Verifique Espaço em Disco
1. Abra "Este Computador"
2. Verifique espaço livre no disco C:
3. Se tiver menos de 5GB:
   - Esvazie Lixeira
   - Delete arquivos da pasta Downloads antigos
   - Solicite limpeza à TI

### 4. Use Outro Navegador
- Se baixou pelo Chrome, tente Edge
- Se baixou pelo Edge, tente Chrome

### 5. Baixe Direto (Sem Visualizar)
- Clique com botão direito no link
- "Salvar link como..."
- Escolha local e salve

### 6. Desabilite Temporariamente Antivírus
⚠️ **Apenas se tiver certeza que o arquivo é seguro**
1. Clique no ícone do antivírus (bandeja)
2. "Pausar proteção" > 15 minutos
3. Tente baixar
4. Reative a proteção

## Arquivo Excel/Word Baixa Como ZIP
Isso pode acontecer. Solução:
1. Localize o arquivo baixado
2. Clique com botão direito
3. "Renomear"
4. Mude a extensão:
   - .zip para .xlsx (Excel)
   - .zip para .docx (Word)
5. Confirme a alteração

## Arquivo PDF Não Abre
1. Verifique tamanho do arquivo (não deve ser 0KB)
2. Clique com botão direito > Abrir com > Adobe Reader
3. Se erro persistir: solicite reenvio do arquivo

## Quando Contatar TI
- Erro persiste em todos navegadores
- Todos arquivos dão erro (não só um)
- Mensagem "Sem espaço em disco"
- Arquivo é muito grande (mais de 500MB)
- Download de sistema corporativo dá erro

## Prevenção
- Manttenha navegador atualizado
- Não baixe arquivos de sites desconhecidos
- Configure pasta Downloads para OneDrive
- Limpe pasta Downloads mensalmente`
  },
  {
    title: 'Conta Microsoft - Como Criar e Configurar',
    category: 'Microsoft 365',
    content: `## O Que é Conta Microsoft Institucional?
É sua identidade digital na organização, usada para acessar:
- Email Outlook (@opequenonazareno.org.br)
- Microsoft Teams
- OneDrive (armazenamento em nuvem)
- Office 365 (Word, Excel, PowerPoint online)
- SharePoint

## Como Fazer Primeiro Acesso

### 1. Receba Credenciais da TI
A TI criará sua conta e enviará:
- **Email:** seunome@opequenonazareno.org.br
- **Senha temporária:** Será pedido para mudar no primeiro acesso

### 2. Primeiro Login
1. Acesse: https://office.com
2. Clique em "Entrar"
3. Digite seu email institucional completo
4. Digite a senha temporária recebida
5. Sistema pedirá para criar nova senha
6. Crie senha seguindo os requisitos:
   - Mínimo 8 caracteres
   - Letras maiúsculas e minúsculas
   - Números
   - Caractere especial (!@#$)

### 3. Configure Segurança (MFA)
O sistema pode pedir "Mais informações necessárias":
1. Clique em "Avançar"
2. Escolha método: Aplicativo móvel (recomendado)
3. Baixe "Microsoft Authenticator" no celular
4. No app, clique em "+"
5. Escolha "Conta corporativa ou de estudante"
6. Escaneie QR Code da tela do PC
7. Pronto! Agora usa o app para aprovar login

## Acessar Email
**Webmail:**
1. https://outlook.office.com
2. Login com email institucional

**Aplicativo Outlook no PC:**
1. Abra Microsoft Outlook
2. "Adicionar conta"
3. Digite email institucional
4. Digite sua senha
5. Clique em "Conectar"

## Instalar Office no Computador
1. Acesse https://office.com
2. Faça login
3. Clique em "Instalar aplicativos do Office"
4. Aguarde download
5. Execute instalador
6. Aguarde instalação (pode demorar 30min)

## Usar OneDrive
**OneDrive = Disco Virtual na Nuvem**
- Acesse de qualquer lugar
- Arquivos ficam seguros
- Compartilhe com colegas

**Configurar no PC:**
1. Procure ícone de nuvem (bandeja do sistema)
2. Clique > "Entrar"
3. Digite email institucional
4. Digite senha
5. Escolha pastas para sincronizar
6. Clique em "Avançar" até finalizar

## Esqueci Minha Senha
1. Acesse https://passwordreset.microsoftonline.com
2. Digite seu email institucional
3. Clique em "Avançar"
4. Escolha método (email de recuperação ou telefone)
5. Digite código recebido
6. Crie nova senha

## Problemas Comuns

### "Conta bloqueada"
- Após 5 tentativas erradas de senha
- Solução: Aguarde 30 minutos ou contate TI

### "Senha expirada"
- Senhas expiram a cada 90 dias
- Sistema pedirá para criar nova
- Use senha diferente das 3 últimas

### "Não recebo código no celular"
- Verifique se número está correto
- Contate TI para atualizar número

## Contatar TI
Abra chamado se:
- Não recebeu credenciais de acesso
- Esqueceu senha e não consegue resetar
- Conta está bloqueada
- Precisa alterar email de recuperação
- Não consegue configurar autenticador`
  }
];

async function seedArticles() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'portal_ti',
    user: 'postgres',
    password: '123',
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');

    // Pegar primeiro usuário admin/it_staff
    const userResult = await client.query(`
      SELECT id, name FROM internal_users 
      WHERE role IN ('admin', 'it_staff') 
      ORDER BY created_at ASC 
      LIMIT 1
    `);

    if (userResult.rows.length === 0) {
      console.log('❌ Nenhum usuário admin/it_staff encontrado');
      return;
    }

    const user = userResult.rows[0];
    console.log(`👤 Criando artigos como: ${user.name}\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const article of faqArticles) {
      try {
        const result = await client.query(
          `INSERT INTO information_articles (title, content, category, is_public, created_by_id, views_count) 
           VALUES ($1, $2, $3, true, $4, 0) 
           RETURNING id, title`,
          [article.title, article.content, article.category, user.id]
        );
        
        console.log(`✅ ${result.rows[0].title}`);
        successCount++;
      } catch (error) {
        console.log(`❌ Erro ao criar: ${article.title}`);
        console.log(`   ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   ✅ Sucesso: ${successCount}`);
    console.log(`   ❌ Erro: ${errorCount}`);
    console.log(`   📖 Total: ${faqArticles.length}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

seedArticles();
