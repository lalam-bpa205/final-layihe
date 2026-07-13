import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import api from '../api/axios';

const HUB_URL = 'http://localhost:5042/hubs/chat';

const timeOf = (d) =>
  new Date(d).toLocaleTimeString('az', { hour: '2-digit', minute: '2-digit' });

export default function ChatPage() {
  const { user } = useSelector((state) => state.auth);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const selectedRef = useRef(null);
  selectedRef.current = selected;

  const loadUsers = useCallback(() => {
    api.get('/chat/users').then(({ data }) => setUsers(data));
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // SignalR — gələn mesajlar anlıq düşür
  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => localStorage.getItem('accessToken') ?? '' })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build();

    connection.on('chatMessage', (m) => {
      const current = selectedRef.current;
      const partnerId = m.senderUserId === user?.id ? m.receiverUserId : m.senderUserId;

      if (current && partnerId === current.id) {
        // Açıq söhbətə aiddir — birbaşa əlavə et
        setMessages((prev) =>
          prev.some((x) => x.id === m.id)
            ? prev
            : [...prev, { id: m.id, senderUserId: m.senderUserId, text: m.text, createdDate: m.createdDate, isMine: m.senderUserId === user?.id }]
        );
        // Açıq söhbətdə gələn mesaj dərhal oxunmuş sayılsın
        if (m.senderUserId === current.id) {
          api.get(`/chat/${current.id}/messages`).catch(() => {});
        }
      } else if (m.senderUserId !== user?.id) {
        // Başqa söhbətdən gəldi — siyahıda sayğacı artır
        setUsers((prev) =>
          prev.map((u) =>
            u.id === m.senderUserId ? { ...u, unreadCount: u.unreadCount + 1 } : u
          )
        );
      }
    });

    connection.start().catch(() => {});
    return () => {
      connection.stop();
    };
  }, [user?.id]);

  const openConversation = async (u) => {
    setSelected(u);
    const { data } = await api.get(`/chat/${u.id}/messages`);
    setMessages(data);
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, unreadCount: 0 } : x)));
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selected || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/chat/${selected.id}/messages`, { text: text.trim() });
      setMessages((prev) =>
        prev.some((x) => x.id === data.id)
          ? prev
          : [...prev, { id: data.id, senderUserId: data.senderUserId, text: data.text, createdDate: data.createdDate, isMine: true }]
      );
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            ← Modullar
          </Link>
          <h1 className="text-lg font-bold text-white">💬 Daxili çat</h1>
        </div>
        <p className="text-sm text-slate-400">
          {user?.firstName} {user?.lastName}
        </p>
      </header>

      <div className="flex-1 flex max-w-6xl w-full mx-auto p-4 gap-4 min-h-0">
        {/* İstifadəçi siyahısı */}
        <aside className="w-72 shrink-0 bg-slate-800 rounded-2xl border border-slate-700 overflow-y-auto">
          <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-700">
            İstifadəçilər
          </p>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => openConversation(u)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-700/60 ${
                selected?.id === u.id ? 'bg-slate-700' : ''
              }`}
            >
              <span className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {u.fullName.slice(0, 1)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-white truncate">{u.fullName}</span>
                <span className="block text-xs text-slate-400">@{u.userName}</span>
              </span>
              {u.unreadCount > 0 && (
                <span className="min-w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center px-1">
                  {u.unreadCount}
                </span>
              )}
            </button>
          ))}
          {users.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-500">İstifadəçi yoxdur.</p>
          )}
        </aside>

        {/* Söhbət */}
        <main className="flex-1 bg-slate-800 rounded-2xl border border-slate-700 flex flex-col min-w-0">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              Söhbət üçün istifadəçi seçin.
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-slate-700 shrink-0">
                <p className="font-semibold text-white">{selected.fullName}</p>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                        m.isMine
                          ? 'rounded-br-md bg-gradient-to-r from-indigo-600 to-blue-600 text-white'
                          : 'rounded-bl-md bg-slate-700 text-slate-100'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                      <p className={`text-[10px] mt-1 ${m.isMine ? 'text-blue-200' : 'text-slate-400'}`}>
                        {timeOf(m.createdDate)}
                      </p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-3 text-4xl">💬</div>
                    <p className="text-sm font-medium text-slate-300">Hələ mesaj yoxdur</p>
                    <p className="mt-1 text-sm text-slate-500">İlk mesajı siz yazın!</p>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={send} className="p-4 border-t border-slate-700 flex gap-2 shrink-0">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Mesajınızı yazın..."
                  maxLength={1000}
                  className="flex-1 rounded-xl bg-slate-700 border border-slate-600 px-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  disabled={!text.trim() || sending}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 font-medium text-white shadow-sm transition-all hover:from-indigo-500 hover:to-blue-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  Göndər
                </button>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
