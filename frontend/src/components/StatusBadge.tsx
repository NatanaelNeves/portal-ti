import '../styles/StatusBadge.css';

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  available:      { cls: 'sb-green',  label: 'Disponível' },
  in_stock:       { cls: 'sb-green',  label: 'Em Estoque' },
  in_use:         { cls: 'sb-blue',   label: 'Em Uso' },
  maintenance:    { cls: 'sb-amber',  label: 'Manutenção' },
  in_maintenance: { cls: 'sb-amber',  label: 'Manutenção' },
  retired:        { cls: 'sb-red',    label: 'Baixado' },
  pending:        { cls: 'sb-amber',  label: 'Pendente' },
  approved:       { cls: 'sb-teal',   label: 'Aprovado' },
  purchased:      { cls: 'sb-indigo', label: 'Comprado' },
  received:       { cls: 'sb-teal',   label: 'Recebido' },
  completed:      { cls: 'sb-green',  label: 'Concluído' },
  rejected:       { cls: 'sb-red',    label: 'Rejeitado' },
};

interface Props {
  status: string;
  label?: string;
}

export default function StatusBadge({ status, label }: Props) {
  const cfg = STATUS_MAP[status] || { cls: 'sb-gray', label: status };
  return <span className={`sb-badge ${cfg.cls}`}>{label ?? cfg.label}</span>;
}
