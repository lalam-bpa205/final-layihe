import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { findModuleByPath } from '../modules';
import NotificationBell from './NotificationBell';
import ChatButton from './ChatButton';

export default function Layout() {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const { user } = useSelector((state) => state.auth);

  const module = findModuleByPath(pathname);
  const userModules = user?.modules ?? [];

  // Naməlum yol və ya icazəsiz modul → modul seçim ekranına qaytar
  if (!module || !userModules.includes(module.key)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar — yalnız aktiv modulun menyusu */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0">
        <div className="px-6 py-5 border-b border-slate-700">
          <h1 className="text-xl font-bold">
            Smart<span className="text-blue-400">ERP</span>
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">Logistika İdarəetmə Sistemi</p>
        </div>

        <Link
          to="/"
          className="mx-3 mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 border border-slate-700"
        >
          ← Modullara qayıt
        </Link>

        <div className="px-6 pt-5 pb-2 flex items-center gap-2">
          <span className="text-xl">{module.icon}</span>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {module.label}
          </p>
        </div>

        <nav className="flex-1 px-3 pb-4 overflow-y-auto">
          <ul className="space-y-1">
            {module.nav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === module.basePath}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-slate-600">
            {module.icon} {module.label}
          </p>
          <div className="flex items-center gap-4">
            <ChatButton />
            <NotificationBell />
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500">{user?.roles?.join(', ')}</p>
            </div>
            <button
              onClick={() => dispatch(logout())}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Çıxış
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
