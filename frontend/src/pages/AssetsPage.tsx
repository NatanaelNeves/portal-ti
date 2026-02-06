import { useEffect, useState } from 'react';
import { assetService } from '../services/assetService';
import { Asset, AssetStatus } from '../types';
import '../styles/AssetsPage.css';

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [status, setStatus] = useState<AssetStatus>(AssetStatus.AVAILABLE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAssets();
  }, [status]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await assetService.getAssetsByStatus(status);
      setAssets(data.assets);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar ativos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1>Ativos</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="status-filter">
        {Object.values(AssetStatus).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`filter-btn ${status === s ? 'active' : ''}`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Carregando...</div>
      ) : assets.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum ativo encontrado</p>
        </div>
      ) : (
        <div className="assets-table">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Série</th>
                <th>Status</th>
                <th>Local</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td>{asset.name}</td>
                  <td>{asset.assetType}</td>
                  <td>{asset.serialNumber || '-'}</td>
                  <td>
                    <span className={`status-badge status-${asset.status}`}>{asset.status}</span>
                  </td>
                  <td>{asset.location || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
