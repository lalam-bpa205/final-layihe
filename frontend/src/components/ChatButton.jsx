import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

/** Header-dəki çat düyməsi — oxunmamış mesaj sayını göstərir. */
export default function ChatButton({ dark = false }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    api.get('/chat/unread-count').then(({ data }) => setCount(data.count)).catch(() => {});
  }, []);

  return (
    <Link
      to="/chat"
      className={`relative rounded-lg p-2 text-xl leading-none ${
        dark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
      }`}
      aria-label="Daxili çat"
    >
      💬
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center px-1">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
