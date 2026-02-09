import QRCode from 'qrcode';

export class QRCodeService {
  /**
   * Gera QR Code como Data URL (base64)
   * @param data - Dados para codificar no QR code
   * @param options - Opções de configuração
   * @returns Promise com data URL do QR code
   */
  static async generateQRCodeDataURL(
    data: string,
    options?: QRCode.QRCodeToDataURLOptions
  ): Promise<string> {
    try {
      const defaultOptions: QRCode.QRCodeToDataURLOptions = {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        margin: 1,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        ...options
      };

      return await QRCode.toDataURL(data, defaultOptions);
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Gera QR Code para um equipamento
   * @param equipmentCode - Código interno do equipamento
   * @param equipmentId - ID do equipamento no banco
   * @returns Promise com data URL do QR code
   */
  static async generateEquipmentQRCode(
    equipmentCode: string,
    equipmentId: string
  ): Promise<string> {
    // Criar payload JSON com informações do equipamento
    const qrData = JSON.stringify({
      type: 'equipment',
      code: equipmentCode,
      id: equipmentId,
      url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/inventario/equipamento/${equipmentId}`,
      timestamp: new Date().toISOString()
    });

    return await this.generateQRCodeDataURL(qrData, {
      width: 400,
      errorCorrectionLevel: 'H' // High error correction para durabilidade
    });
  }

  /**
   * Gera QR Code para termo de responsabilidade
   * @param termId - ID do termo
   * @param termNumber - Número do termo
   * @returns Promise com data URL do QR code
   */
  static async generateTermQRCode(
    termId: string,
    termNumber: string
  ): Promise<string> {
    const qrData = JSON.stringify({
      type: 'term',
      number: termNumber,
      id: termId,
      url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/inventario/termo/${termId}`,
      timestamp: new Date().toISOString()
    });

    return await this.generateQRCodeDataURL(qrData, {
      width: 300,
      errorCorrectionLevel: 'M'
    });
  }

  /**
   * Gera QR Code simples com URL
   * @param url - URL para encodar
   * @returns Promise com data URL do QR code
   */
  static async generateURLQRCode(url: string): Promise<string> {
    return await this.generateQRCodeDataURL(url, {
      width: 300,
      errorCorrectionLevel: 'M'
    });
  }

  /**
   * Gera QR Code como buffer (para salvar em arquivo ou enviar)
   * @param data - Dados para codificar
   * @returns Promise com buffer do QR code
   */
  static async generateQRCodeBuffer(data: string): Promise<Buffer> {
    try {
      return await QRCode.toBuffer(data, {
        errorCorrectionLevel: 'M',
        type: 'png',
        margin: 1,
        width: 400
      });
    } catch (error) {
      console.error('Error generating QR code buffer:', error);
      throw new Error('Failed to generate QR code buffer');
    }
  }
}

export default QRCodeService;
