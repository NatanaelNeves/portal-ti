import toast from 'react-hot-toast';

/**
 * Utilitário para notificações toast padronizadas
 */

export const showToast = {
  /**
   * Toast de sucesso
   */
  success: (message: string) => {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#007A33',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#007A33',
      },
    });
  },

  /**
   * Toast de erro
   */
  error: (message: string) => {
    toast.error(message, {
      duration: 4000,
      position: 'top-right',
      style: {
        background: '#dc3545',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#dc3545',
      },
    });
  },

  /**
   * Toast de aviso
   */
  warning: (message: string) => {
    toast(message, {
      duration: 3500,
      position: 'top-right',
      icon: '⚠️',
      style: {
        background: '#F28C38',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
      },
    });
  },

  /**
   * Toast de informação
   */
  info: (message: string) => {
    toast(message, {
      duration: 3000,
      position: 'top-right',
      icon: 'ℹ️',
      style: {
        background: '#4A90E2',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
      },
    });
  },

  /**
   * Toast de loading com promise
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      },
      {
        style: {
          padding: '16px',
          borderRadius: '8px',
        },
        success: {
          style: {
            background: '#007A33',
            color: '#fff',
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#007A33',
          },
        },
        error: {
          style: {
            background: '#dc3545',
            color: '#fff',
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#dc3545',
          },
        },
      }
    );
  },

  /**
   * Toast customizado
   */
  custom: (message: string, options?: any) => {
    toast(message, {
      duration: 3000,
      position: 'top-right',
      style: {
        padding: '16px',
        borderRadius: '8px',
      },
      ...options,
    });
  },
};
