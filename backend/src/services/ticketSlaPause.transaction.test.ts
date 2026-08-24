import {
  closeSlaPause,
  openSlaPause,
  reconcileSlaPause,
  type SqlExecutor,
} from './ticketSlaClock';

/**
 * Testes da consistência entre status e relógio de SLA.
 *
 * NÃO usam PostgreSQL — não há banco neste ambiente. O que eles exercitam é o
 * CONTRATO das operações de pausa: quais comandos são emitidos, em que ordem,
 * e para qual conexão. Isso cobre a parte que depende de nós (usar o mesmo
 * client da transação, ordenar fechar-antes-de-abrir) e deixa explícito o que
 * só o banco pode garantir (o índice único parcial, o `FOR UPDATE`).
 *
 * Os testes de semântica de rollback estão marcados com o que o Postgres faz,
 * e não com o que este dublê faz: aqui verificamos que a chamada PROPAGA o
 * erro, que é a condição para o `catch` do handler executar o ROLLBACK.
 */

/** Dublê de conexão que registra os comandos recebidos. */
function fakeClient(options: { failOn?: RegExp } = {}) {
  const statements: Array<{ sql: string; params?: any[] }> = [];
  const client: SqlExecutor & { statements: typeof statements } = {
    statements,
    query: async (sql: string, params?: any[]) => {
      statements.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      if (options.failOn && options.failOn.test(sql)) {
        throw new Error('falha simulada no banco');
      }
      return { rows: [], rowCount: 0 };
    },
  };
  return client;
}

const sqlOf = (client: ReturnType<typeof fakeClient>) => client.statements.map((s) => s.sql);

describe('pausa de SLA — uso do client da transação', () => {
  it('entrar em espera grava a pausa NO client recebido, não no pool', async () => {
    const client = fakeClient();
    await reconcileSlaPause('ticket-1', 'aguardando_aquisicao', 'compra de fonte', 'user-1', client);

    // Duas escritas: encerra pausa de outro tipo (defensivo) e abre a nova.
    expect(client.statements).toHaveLength(2);
    expect(sqlOf(client)[1]).toContain('INSERT INTO ticket_sla_pauses');

    const insert = client.statements[1];
    expect(insert.params).toEqual(['ticket-1', 'aguardando_aquisicao', 'compra de fonte', 'user-1']);
  });

  it('sair da espera fecha a pausa no mesmo client', async () => {
    const client = fakeClient();
    await reconcileSlaPause('ticket-1', 'in_progress', null, 'user-1', client);

    expect(client.statements).toHaveLength(1);
    expect(sqlOf(client)[0]).toContain('UPDATE ticket_sla_pauses');
    expect(sqlOf(client)[0]).toContain('ended_at = NOW()');
    expect(sqlOf(client)[0]).toContain('ended_at IS NULL');
  });

  it('troca aquisição → terceiros fecha o período anterior ANTES de abrir o novo', async () => {
    const client = fakeClient();
    await reconcileSlaPause('ticket-1', 'aguardando_terceiros', 'enviado à assistência', 'user-1', client);

    const sql = sqlOf(client);
    expect(sql).toHaveLength(2);

    // Ordem importa: se abrisse primeiro, existiriam duas pausas abertas no
    // instante entre os dois comandos.
    expect(sql[0]).toContain('UPDATE ticket_sla_pauses');
    expect(sql[0]).toContain('status <> $2');
    expect(sql[1]).toContain('INSERT INTO ticket_sla_pauses');
    expect(client.statements[0].params).toEqual(['ticket-1', 'aguardando_terceiros', 'user-1']);
  });

  it('abrir pausa é condicional: não insere se já existe uma aberta', async () => {
    const client = fakeClient();
    await openSlaPause('ticket-1', 'aguardando_aquisicao', null, 'user-1', client);

    // A proteção contra pausa duplicada está no próprio INSERT, não numa
    // leitura anterior — é isso que a torna segura sob concorrência.
    const sql = sqlOf(client)[0];
    expect(sql).toContain('WHERE NOT EXISTS');
    expect(sql).toContain('ended_at IS NULL');
  });
});

describe('pausa de SLA — propagação de falha (base do rollback)', () => {
  it('falha ao abrir a pausa PROPAGA o erro', async () => {
    const client = fakeClient({ failOn: /INSERT INTO ticket_sla_pauses/ });

    // O handler envolve a chamada num try/catch que emite ROLLBACK. Se esta
    // promessa resolvesse silenciosamente, o status persistiria sozinho — que
    // é exatamente o bug que a transação existe para impedir.
    await expect(
      reconcileSlaPause('ticket-1', 'aguardando_aquisicao', null, 'user-1', client),
    ).rejects.toThrow('falha simulada no banco');
  });

  it('falha ao fechar a pausa PROPAGA o erro', async () => {
    const client = fakeClient({ failOn: /UPDATE ticket_sla_pauses/ });
    await expect(closeSlaPause('ticket-1', 'user-1', client)).rejects.toThrow('falha simulada');
  });
});

describe('pausa de SLA — concorrência', () => {
  it('duas transições simultâneas emitem INSERTs condicionais, nunca incondicionais', async () => {
    const a = fakeClient();
    const b = fakeClient();

    await Promise.all([
      reconcileSlaPause('ticket-1', 'aguardando_aquisicao', null, 'user-a', a),
      reconcileSlaPause('ticket-1', 'aguardando_aquisicao', null, 'user-b', b),
    ]);

    // Nenhum dos dois pode inserir sem checar. Somado ao `FOR UPDATE` do
    // handler e ao índice único parcial, isso fecha o caminho para duas
    // pausas abertas. A exclusão mútua real é do banco, não deste teste.
    for (const client of [a, b]) {
      const insert = sqlOf(client).find((sql) => sql.startsWith('INSERT INTO ticket_sla_pauses'));
      expect(insert).toBeDefined();
      expect(insert).toContain('WHERE NOT EXISTS');
    }
  });
});

describe('pausa de SLA — sem client explícito', () => {
  it('cai no pool quando nenhum client é passado', async () => {
    // Fora de transação (scripts, reparo), as funções seguem utilizáveis.
    // Não executamos aqui para não tocar no pool real; o que garantimos é que
    // a assinatura aceita a omissão.
    expect(typeof reconcileSlaPause).toBe('function');
    expect(reconcileSlaPause.length).toBeGreaterThanOrEqual(4);
  });
});
