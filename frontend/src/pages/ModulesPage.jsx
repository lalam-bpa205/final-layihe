import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe, logout } from '../features/auth/authSlice';
import { MODULES } from '../modules';
import NotificationBell from '../components/NotificationBell';
import ChatButton from '../components/ChatButton';

export default function ModulesPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const userModules = user?.modules ?? [];
  const isAdmin = user?.roles?.includes('SuperAdmin') || user?.roles?.includes('Admin');

  // Modul icazələri dəyişmiş ola bilər — hər dəfə serverdən təzələnir
  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      <header className="relative px-8 py-5 flex items-center justify-between border-b border-slate-800">
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-blue-500/40 via-indigo-500/20 to-transparent" />
        <div>
          <h1 className="text-2xl font-bold text-white">
            Smart<span className="text-blue-400">ERP</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Logistika İdarəetmə Sistemi</p>
        </div>
        <div className="flex items-center gap-4">
          <ChatButton dark />
          <NotificationBell dark />
          <div className="text-right">
            <p className="text-sm font-medium text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-slate-400">{user?.roles?.join(', ')}</p>
          </div>
          <button
            onClick={() => dispatch(logout())}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Çıxış
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-12">
        <h2 className="text-xl font-semibold text-white mb-1">
          Xoş gəlmisiniz, {user?.firstName}! 👋
        </h2>
        <p className="text-slate-400 mb-8">İşləmək istədiyiniz modulu seçin.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MODULES.filter((m) => !m.adminOnly || isAdmin).map((m) => {
            const hasAccess = userModules.includes(m.key);
            const active = m.ready && hasAccess;

            const card = (
              <div
                className={`group flex h-full flex-col rounded-2xl border p-6 transition-all duration-200 ${
                  active
                    ? 'cursor-pointer border-slate-700 bg-slate-800 hover:-translate-y-1 hover:border-blue-500 hover:bg-slate-800/80 hover:shadow-xl hover:shadow-blue-500/10'
                    : 'border-slate-800 bg-slate-800/40 opacity-60'
                }`}
              >
                <div className="mb-4 text-4xl">{m.icon}</div>
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-lg font-semibold tracking-tight text-white">{m.label}</h3>
                  {!m.ready && (
                    <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                      Tezliklə
                    </span>
                  )}
                  {m.ready && !hasAccess && (
                    <span className="rounded-full bg-red-900/60 px-2 py-0.5 text-xs text-red-300">
                      🔒 İcazə yoxdur
                    </span>
                  )}
                </div>
                <p className="flex-1 text-sm text-slate-400">{m.description}</p>
                {active && (
                  <p className="mt-4 text-sm font-medium text-blue-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    Daxil ol →
                  </p>
                )}
              </div>
            );

            return active ? (
              <Link key={m.key} to={m.path}>
                {card}
              </Link>
            ) : (
              <div key={m.key}>{card}</div>
            );
          })}
        </div>

      </main>
    </div>
  );
}
