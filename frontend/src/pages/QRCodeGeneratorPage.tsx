import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/QRCodePage.css';

interface Equipment {
  id: string;
  internal_code: string;
  type: string;
  brand: string;
  model: string;
  serial_number: string;
  qr_code?: string;
}

const QRCodeGeneratorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [qrCode, setQrCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchEquipmentAndGenerateQR();
    }
  }, [id]);

  const fetchEquipmentAndGenerateQR = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('internal_token');

      // Buscar equipamento
      const equipmentRes = await axios.get(
        `/api/inventory/equipment/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEquipment(equipmentRes.data.equipment);

      // Gerar QR Code
      const qrRes = await axios.get(
        `/api/inventory/equipment/${id}/qrcode`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setQrCode(qrRes.data.qr_code);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.response?.data?.message || 'Erro ao gerar QR Code');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrCode) return;

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `QRCode_${equipment?.internal_code || 'equipamento'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="qrcode-page">
        <div className="loading">Gerando QR Code...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qrcode-page">
        <div className="error">{error}</div>
        <button className="btn" onClick={() => navigate(-1)}>
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="qrcode-page">
      <div className="qrcode-container no-print">
        <div className="qrcode-header">
          <h1>📱 QR Code do Equipamento</h1>
          <div className="button-group">
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>
              ← Voltar
            </button>
            <button className="btn btn-primary" onClick={handleDownload}>
              💾 Baixar QR Code
            </button>
            <button className="btn btn-success" onClick={handlePrint}>
              🖨️ Imprimir
            </button>
          </div>
        </div>

        {equipment && (
          <div className="equipment-info">
            <h3>Informações do Equipamento:</h3>
            <div className="info-grid">
              <div className="info-item">
                <strong>Código:</strong>
                <span>{equipment.internal_code}</span>
              </div>
              <div className="info-item">
                <strong>Tipo:</strong>
                <span>{equipment.type}</span>
              </div>
              <div className="info-item">
                <strong>Marca:</strong>
                <span>{equipment.brand}</span>
              </div>
              <div className="info-item">
                <strong>Modelo:</strong>
                <span>{equipment.model}</span>
              </div>
              {equipment.serial_number && (
                <div className="info-item">
                  <strong>Nº Série:</strong>
                  <span>{equipment.serial_number}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Área de impressão */}
      <div className="print-area">
        <div className="qrcode-label">
          <div className="label-header">
            <h2>Pequeno Nazareno</h2>
            <p>Inventário de Equipamentos</p>
          </div>

          {qrCode && (
            <div className="qrcode-image-container">
              <img src={qrCode} alt="QR Code" className="qrcode-image" />
            </div>
          )}

          {equipment && (
            <div className="label-info">
              <div className="label-code">{equipment.internal_code}</div>
              <div className="label-description">
                {equipment.type} - {equipment.brand} {equipment.model}
              </div>
              {equipment.serial_number && (
                <div className="label-serial">SN: {equipment.serial_number}</div>
              )}
            </div>
          )}

          <div className="label-footer">
            <p>Escaneie para ver detalhes completos</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGeneratorPage;
