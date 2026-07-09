import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe, logout } from '../features/auth/authSlice';
import { MODULES } from '../modules';
import AdminDashboard from '../components/AdminDashboard';
import NotificationBell from '../components/NotificationBell';

export default function ModulesPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const userModules = user?.modules ?? [];

  // Modul icazələri dəyişmiş ola bilər — hər dəfə serverdən təzələnir
  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="px-8 py-5 flex items-center justify-between border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Smart<span className="text-blue-400">ERP</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Logistika İdarəetmə Sistemi</p>
        </div>
        <div className="flex items-center gap-4">
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
          {MODULES.map((m) => {
            const hasAccess = userModules.includes(m.key);
            const active = m.ready && hasAccess;

            const card = (
              <div
                className={`rounded-2xl p-6 h-full border transition-all ${
                  active
                    ? 'bg-slate-800 border-slate-700 hover:border-blue-500 hover:bg-slate-800/80 hover:-translate-y-1 cursor-pointer'
                    : 'bg-slate-800/40 border-slate-800 opacity-60'
                }`}
              >
                <div className="text-4xl mb-4">{m.icon}</div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-white">{m.label}</h3>
                  {!m.ready && (
                    <span className="rounded-full bg-slate-700 text-slate-300 text-xs px-2 py-0.5">
                      Tezliklə
                    </span>
                  )}
                  {m.ready && !hasAccess && (
                    <span className="rounded-full bg-red-900/60 text-red-300 text-xs px-2 py-0.5">
                      🔒 İcazə yoxdur
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400">{m.description}</p>
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

        {/* İdarəetmə paneli — yalnız SuperAdmin/Admin görür */}
        {(user?.roles?.includes('SuperAdmin') || user?.roles?.includes('Admin')) && (
          <AdminDashboard />
        )}
      </main>
    </div>
  );
}
