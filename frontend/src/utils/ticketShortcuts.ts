/**
 * Atalhos de problemas comuns. Um toque preenche equipe, categoria e um texto
 * inicial — usado na página inicial (link com `?atalho=<id>`) e na primeira
 * etapa de "Abrir chamado".
 */
export interface TicketShortcut {
  id: string;
  /** Classe do Tabler Icons. */
  icon: string;
  label: string;
  hint: string;
  dept: 'ti' | 'administrativo' | 'rh';
  cat: string;
  title: string;
  description: string;
}

export const TICKET_SHORTCUTS: TicketShortcut[] = [
  { id: 'internet', icon: 'ti-wifi-off', label: 'Internet fora', hint: 'Sem conexão no computador', dept: 'ti', cat: 'internet', title: 'Internet sem conexão', description: 'Estou sem acesso à internet no meu computador.' },
  { id: 'impressora', icon: 'ti-printer', label: 'Impressora', hint: 'Não imprime ou está com erro', dept: 'ti', cat: 'impressora', title: 'Impressora com problema', description: 'A impressora não está funcionando corretamente.' },
  { id: 'acesso', icon: 'ti-lock', label: 'Não consigo entrar', hint: 'Senha ou acesso bloqueado', dept: 'ti', cat: 'outro', title: 'Problema de acesso ao sistema', description: 'Não estou conseguindo acessar o sistema / minha senha está bloqueada.' },
  { id: 'computador', icon: 'ti-device-desktop', label: 'Computador lento', hint: 'Travando ou lento demais', dept: 'ti', cat: 'computador', title: 'Computador lento ou travando', description: 'Meu computador está muito lento e travando com frequência.' },
  { id: 'chave', icon: 'ti-key', label: 'Cópia de chave', hint: 'Chave de sala ou armário', dept: 'administrativo', cat: 'copia_chave', title: 'Solicitar cópia de chave', description: 'Preciso de uma cópia de chave.' },
  { id: 'ponto', icon: 'ti-clock-edit', label: 'Ajuste de ponto', hint: 'Corrigir horário registrado', dept: 'rh', cat: 'RH_PONTO', title: 'Ajuste de ponto', description: '' },
];

export const findShortcut = (id: string | null | undefined) =>
  TICKET_SHORTCUTS.find((shortcut) => shortcut.id === id);
