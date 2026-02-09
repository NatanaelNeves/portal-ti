import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InventoryLayout from '../components/InventoryLayout';
import { ExcelExportService } from '../services/excelExportService';
import '../styles/ResponsibilitiesPage.css';

interface Equipment {
  id: string;
  internal_code: string;
  type: string;
  brand: string;
  model: string;
  responsible_name: string;
  responsible_id: string;
  department: string;
  issued_date: string;
  current_status: string;
  term_status: string;
}

export default function ResponsibilitiesPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchResponsibilities();
  }, []);

  const fetchResponsibilities = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');
      const response = await fetch('/api/inventory/responsibilities', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar responsabilidades');
      }

      const data = await response.json();
      setEquipments(data.responsibilities || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="responsibilities-page"><div className="loading">Carregando...</div></div>;
  }

  return (
    <InventoryLayout>
      <div className="responsibilities-page">
        <div className="page-header">
          <div>
            <h1>👤 Responsabilidades</h1>
            <p>Quem está com cada equipamento</p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const exportData = equipments.map(eq => ({
                responsible_name: eq.responsible_name || 'Sem responsável',
                department: eq.department || '-',
                equipment_type: eq.type,
                brand: eq.brand,
                model: eq.model,
                internal_code: eq.internal_code,
                issued_date: eq.issued_date,
                current_status: eq.current_status
              }));
              ExcelExportService.exportToExcel(
                exportData,
                [
                  { header: 'Responsável', field: 'responsible_name', width: 25 },
                  { header: 'Setor', field: 'department', width: 20 },
                  { header: 'Tipo', field: 'equipment_type', width: 15 },
                  { header: 'Marca', field: 'brand', width: 15 },
                  { header: 'Modelo', field: 'model', width: 20 },
                  { header: 'Código', field: 'internal_code', width: 15 },
                  { header: 'Desde', field: 'issued_date', width: 15, format: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '-' },
                  { header: 'Status', field: 'current_status', width: 15 }
                ],
                'responsabilidades',
                'Responsabilidades'
              );
            }}
            disabled={equipments.length === 0}
          >
            📊 Exportar Excel
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="responsibilities-container">
          <table className="responsibilities-table">
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Setor</th>
                <th>Equipamento</th>
                <th>Código</th>
                <th>Desde</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {equipments.map((eq) => (
                <tr key={eq.id} className={`status-${eq.current_status}`}>
                  <td className="person-cell">
                    <strong>{eq.responsible_name || 'Sem responsável'}</strong>
                  </td>
                  <td>{eq.department || '-'}</td>
                  <td>{eq.brand} {eq.model}</td>
                  <td className="code-cell">{eq.internal_code}</td>
                  <td>{eq.issued_date ? new Date(eq.issued_date).toLocaleDateString('pt-BR') : '-'}</td>
                  <td>
                    <span className={`status-badge status-${eq.current_status}`}>
                      {eq.current_status === 'in_use' && 'Em uso'}
                      {eq.current_status === 'in_stock' && 'Em estoque'}
                      {eq.current_status === 'in_maintenance' && 'Manutenção'}
                    </span>
                  </td>
                  {/* <td>
                    <button 
                      className="btn-action"
                      onClick={() => navigate(`/inventario/responsabilidades/${eq.id}`)}
                    >
                      Ver detalhes
                    </button>
                  </td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="quick-actions">
          <button className="btn btn-primary" onClick={() => navigate('/inventario/equipamentos')}>
            + Ver equipamentos
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/inventario/recebimento')}>
            ↩ Receber devolução
          </button>
        </div>
      </div>
    </InventoryLayout>
  );
}
