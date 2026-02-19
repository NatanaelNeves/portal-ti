import { describe, it, expect } from 'vitest';

// Utility functions for testing

export function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  return true; // Simplified validation
}

describe('Utils Functions', () => {
  describe('formatDate', () => {
    it('should format ISO date to pt-BR', () => {
      const result = formatDate('2026-02-19T10:00:00.000Z');
      expect(result).toBe('19/02/2026');
    });
  });

  describe('formatCurrency', () => {
    it('should format number as BRL currency', () => {
      const result = formatCurrency(1500.50);
      expect(result).toContain('1.500,50');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0,00');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(2048)).toBe('2.0 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(5242880)).toBe('5.0 MB');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@company.com.br')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
    });
  });

  describe('validateCPF', () => {
    it('should validate CPF length', () => {
      expect(validateCPF('12345678901')).toBe(true);
      expect(validateCPF('123.456.789-01')).toBe(true);
    });

    it('should reject invalid CPF', () => {
      expect(validateCPF('123')).toBe(false);
      expect(validateCPF('11111111111')).toBe(false);
    });
  });
});
