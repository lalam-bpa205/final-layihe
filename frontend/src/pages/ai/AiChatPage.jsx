import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';

const SUGGESTIONS = [
  'Bu ayın maliyyə vəziyyətini analiz et',
  'Hansı məhsulların stoku azalır? Nə sifariş etməliyəm?',
  'Qeyri-adi və ya böyük xərclər varmı?',
  'Ödənilməmiş fakturalar üzrə vəziyyət necədir?',
  'Biznes üçün 3 tövsiyə ver',
];

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
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">🤖 AI Köməkçi</h2>

      <div className="flex-1 bg-white rounded-2xl shadow overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-slate-500 mb-6">
              ERP məlumatlarınız əsasında suallara cavab verirəm — maliyyə təhlili,
              stok tövsiyələri, xərc nəzarəti və biznes tövsiyələri.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:border-blue-400"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : m.error
                    ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                    : 'bg-slate-100 text-slate-800'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl px-4 py-3 text-sm text-slate-500">
              Düşünürəm<span className="animate-pulse">...</span>
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
          className="flex-1 rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Sualınızı yazın..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6"
        >
          Göndər
        </button>
      </form>
    </div>
  );
}
