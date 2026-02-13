import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'portal_ti',
  user: 'postgres',
  password: '123',
});

async function checkResolvedTickets() {
  try {
    console.log('📊 Verificando tickets resolvidos...\n');
    
    // Buscar todos os tickets resolvidos
    const result = await pool.query(`
      SELECT 
        id,
        title,
        status,
        created_at,
        updated_at,
        TO_CHAR(updated_at, 'YYYY-MM-DD') as updated_date
      FROM tickets 
      WHERE status IN ('resolved', 'closed')
      ORDER BY updated_at DESC
    `);

    console.log(`Total de tickets resolvidos/fechados: ${result.rows.length}\n`);

    // Agrupar por data de resolução
    const byDate: Record<string, any[]> = {};
    const today = new Date().toISOString().split('T')[0];
    
    result.rows.forEach(ticket => {
      const date = ticket.updated_date;
      if (!byDate[date]) {
        byDate[date] = [];
      }
      byDate[date].push(ticket);
    });

    console.log('=== TICKETS RESOLVIDOS POR DATA ===\n');
    
    Object.keys(byDate).sort().reverse().forEach(date => {
      const isToday = date === today;
      console.log(`📅 ${date}${isToday ? ' (HOJE)' : ''}: ${byDate[date].length} tickets`);
      
      byDate[date].forEach(ticket => {
        console.log(`   [${ticket.id.substring(0, 8)}] ${ticket.title} - Status: ${ticket.status}`);
        console.log(`      Criado: ${new Date(ticket.created_at).toLocaleString('pt-BR')}`);
        console.log(`      Atualizado: ${new Date(ticket.updated_at).toLocaleString('pt-BR')}`);
      });
      console.log('');
    });

    console.log(`\n✅ Resolvidos HOJE (${today}): ${byDate[today]?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

checkResolvedTickets();
