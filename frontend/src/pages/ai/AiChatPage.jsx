import { useEffect, useRef, useState } from 'react';
import { PageHeader, Button } from '../../components/ui';
import api from '../../api/axios';

const SUGGESTIONS = [
  'Bu ayın maliyyə vəziyyətini analiz et',
  'Hansı məhsulların stoku azalır? Nə sifariş etməliyəm?',
  'Qeyri-adi və ya böyük xərclər varmı?',
  'Ödənilməmiş fakturalar üzrə vəziyyət necədir?',
  'Biznes üçün 3 tövsiyə ver',
];

function TypingDots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

function AiAvatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-sm shadow-sm">
      🤖
    </span>
  );
}

export default function AiChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const ask = async (question) => {
    const q = question.trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai/ask', { question: q });
      setMessages((prev) => [...prev, { role: 'ai', text: data.answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          error: true,
          text: err.response?.data?.message ?? 'AI xidmətinə qoşulmaq mümkün olmadı.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-9rem)]">
      <PageHeader
        title="🤖 AI Köməkçi"
        description="ERP məlumatlarınız əsasında təhlil, tövsiyə və cavablar"
      />

      <div className="flex-1 rounded-2xl border border-slate-200/60 bg-white shadow-sm overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center py-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-3xl shadow-lg shadow-indigo-500/20">
              🤖
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-800">
              ERP məlumatlarınız əsasında sual verin
            </h3>
            <p className="mt-1 mb-6 max-w-md text-sm text-slate-500">
              Maliyyə təhlili, stok tövsiyələri, xərc nəzarəti və biznes tövsiyələri —
              hamısı sistemdəki real rəqəmlərə əsaslanır.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:scale-[0.98]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex items-end gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'ai' && <AiAvatar />}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap shadow-sm ${
                m.role === 'user'
                  ? 'rounded-br-md bg-gradient-to-r from-indigo-600 to-blue-600 text-white'
                  : m.error
                    ? 'rounded-bl-md border border-amber-200 bg-amber-50 text-amber-800'
                    : 'rounded-bl-md border border-slate-200/60 bg-white text-slate-700'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-end gap-2">
            <AiAvatar />
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200/60 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
              <span>Düşünürəm</span>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); ask(input); }}
        className="mt-4 flex gap-2"
      >
        <input
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
          placeholder="Sualınızı yazın..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <Button type="submit" size="lg" loading={loading} disabled={!input.trim()}>
          Göndər
        </Button>
      </form>
    </div>
  );
}
