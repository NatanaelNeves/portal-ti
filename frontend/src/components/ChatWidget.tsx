import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatWidget() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Sou o assistente do Portal de TI. Posso ajudar com dúvidas rápidas sobre tecnologia, sistemas e procedimentos. O que você precisa?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/ai/status').then(r => setAiAvailable(r.data.enabled)).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await api.post('/ai/chat', {
        message: text,
        history: newMessages.slice(-6),
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Não consegui processar sua pergunta agora. Tente abrir um chamado para falar com a equipe de TI.' }]);
    }
    setLoading(false);
  };

  if (!aiAvailable) return null;

  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999 }}>
      {/* Chat panel */}
      {open && (
        <div style={{
          width: 340, height: 480, background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column', marginBottom: '0.75rem',
        }}>
          {/* Header */}
          <div style={{ background: '#007A33', color: '#fff', padding: '0.75rem 1rem', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>✦ Assistente TI</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>Powered by Claude</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '0.5rem 0.75rem', borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                  background: msg.role === 'user' ? '#007A33' : '#f1f5f9',
                  color: msg.role === 'user' ? '#fff' : '#374151',
                  fontSize: '0.85rem', lineHeight: 1.4,
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#f1f5f9', borderRadius: '12px 12px 12px 0', padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                  digitando...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick actions */}
          <div style={{ padding: '0 0.75rem 0.5rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {['Como trocar senha?', 'Internet fora', 'Impressora'].map(q => (
              <button key={q} onClick={() => { setInput(q); }} style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '99px', cursor: 'pointer' }}>{q}</button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '0.5rem 0.75rem 0.75rem', display: 'flex', gap: '0.4rem', borderTop: '1px solid #f1f5f9' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Escreva sua dúvida..."
              disabled={loading}
              style={{ flex: 1, padding: '0.4rem 0.6rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
            />
            <button onClick={send} disabled={loading || !input.trim()} style={{ padding: '0.4rem 0.75rem', background: '#007A33', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
              →
            </button>
          </div>

          {/* Open ticket link */}
          <div style={{ padding: '0 0.75rem 0.75rem', textAlign: 'center' }}>
            <button onClick={() => { navigate('/abrir-chamado'); setOpen(false); }} style={{ fontSize: '0.75rem', color: '#007A33', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Não resolveu? Abrir chamado →
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 52, height: 52, borderRadius: '50%',
          background: open ? '#374151' : '#007A33',
          color: '#fff', border: 'none', cursor: 'pointer',
          fontSize: '1.4rem', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s',
        }}
        title={open ? 'Fechar chat' : 'Assistente TI'}
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}
