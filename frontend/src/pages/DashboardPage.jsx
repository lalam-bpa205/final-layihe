import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/auth/authSlice';

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">
            Smart<span className="text-blue-600">ERP</span>
          </h1>
          <div className="flex items-center gap-4">
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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Xoş gəlmisiniz, {user?.firstName}! 👋
          </h2>
          <p className="text-slate-500">
            Dashboard modulu Faza 7-də KPI kartları və qrafiklərlə zənginləşdiriləcək.
          </p>
        </div>
      </main>
    </div>
  );
}
