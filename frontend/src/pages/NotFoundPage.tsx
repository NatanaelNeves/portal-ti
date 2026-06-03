import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '1rem',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <div style={{ fontSize: '4rem', lineHeight: 1 }}>404</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>Página não encontrada</h1>
      <p style={{ color: '#64748b', margin: 0, maxWidth: 360 }}>
        O endereço que você acessou não existe ou foi movido.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          marginTop: '0.5rem',
          padding: '0.6rem 1.5rem',
          background: '#007A33',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.95rem',
        }}
      >
        Voltar ao início
      </button>
    </div>
  );
}
