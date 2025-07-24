// src/pages/DashboardPage.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../App';
import {
  LuChevronDown,
  LuChevronUp,
  LuExternalLink,
  LuPencil,
  LuTrash2,
  LuX,
  LuMaximize2
} from 'react-icons/lu';

/* util */
const toCL = n => new Date(n).toLocaleString('es-CL');

/* feedback snack */
function Snack({ msg, onClose }) {
  if (!msg) return null;
  return (
    <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 animate-fade-in">
      {msg}
      <button onClick={onClose} className="ml-2 hover:text-yellow-300">
        <LuX size={16} />
      </button>
    </div>
  );
}

/* modal */
function Modal({ url, onClose }) {
  if (!url) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1c2e1f] w-[90%] h-[90%] rounded-lg shadow-xl overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 rounded-full p-1"
          title="Cerrar"
        >
          <LuX size={20} className="text-white" />
        </button>
        <iframe src={url} className="w-full h-full border-none" allowFullScreen />
      </div>
    </div>
  );
}

/* skeleton */
const CardSkeleton = () => (
  <div className="animate-pulse bg-white/60 dark:bg-[#2e2b26] rounded-lg h-[460px]" />
);

export default function DashboardPage() {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [snack, setSnack] = useState('');
  const [preview, setPreview] = useState(null);
  const [refreshKeys, setRefreshKeys] = useState({});

  /* fetch */
  const fetchDashboards = async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('dashboards')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha', { ascending: order === 'asc' });

    if (error) console.error(error);
    else setDashboards(data);

    setLoading(false);
  };

  useEffect(() => {
    fetchDashboards();
  }, [order]);

  /* CRUD helpers */
  const eliminarDashboard = async id => {
    if (!window.confirm('¿Eliminar este gráfico?')) return;
    const { error } = await supabase.from('dashboards').delete().eq('id', id);
    if (!error) {
      setDashboards(dashboards.filter(d => d.id !== id));
      setSnack('Gráfico eliminado');
    }
  };

  const editarTitulo = async (id, actual) => {
    const nuevo = window.prompt('Nuevo título:', actual)?.trim();
    if (!nuevo || nuevo === actual) return;
    const { error } = await supabase.from('dashboards').update({ titulo: nuevo }).eq('id', id);
    if (!error) {
      setDashboards(dashboards.map(d => (d.id === id ? { ...d, titulo: nuevo } : d)));
      setSnack('Título actualizado');
    }
  };

  /* filtros */
  const filtered = dashboards.filter(d => {
    const matchTitle = d.titulo.toLowerCase().includes(search.toLowerCase());
    const fecha = new Date(d.fecha);
    const inRange =
      (!dateFrom || fecha >= new Date(dateFrom)) && (!dateTo || fecha <= new Date(dateTo));
    return matchTitle && inRange;
  });

  const handleSearchKey = e => {
    if (e.key === 'Enter') e.preventDefault();
  };

  /* UI */
  return (
    <div className="min-h-screen bg-[url('/fondo-forestal-pro.jpg')] bg-cover bg-fixed bg-center p-6">
      {/* listado / loading */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(item => {
            /* —— URL dinámica —— */
            const forceRefresh = refreshKeys[item.id];
            const baseUrl = `https://graficos2-production.up.railway.app/?grafico_id=${item.id}`;
            const finalUrl = forceRefresh ? `${baseUrl}&actualizar=true` : baseUrl;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-[#2e2b26] border border-gray-200 dark:border-gray-600 rounded-lg shadow-md hover:shadow-xl transition overflow-hidden relative group"
              >
                {/* header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[#5E564D] dark:text-white line-clamp-2">
                      {item.titulo}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Guardado: {toCL(item.fecha)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => editarTitulo(item.id, item.titulo)}
                      className="bg-yellow-400 hover:bg-yellow-500 rounded p-1"
                      title="Editar título"
                    >
                      <LuPencil size={16} className="text-white" />
                    </button>
                    <button
                      onClick={() => eliminarDashboard(item.id)}
                      className="bg-red-500 hover:bg-red-600 rounded p-1"
                      title="Eliminar"
                    >
                      <LuTrash2 size={16} className="text-white" />
                    </button>
                  </div>
                </div>

                {/* iframe */}
                <iframe
                  key={forceRefresh || item.id}
                  src={finalUrl}
                  className="w-full h-[400px] rounded border"
                  loading="lazy"
                />

                {/* overlay */}
                <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() =>
                      setRefreshKeys(prev => ({
                        ...prev,
                        [item.id]: Math.random().toString()
                      }))
                    }
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-2"
                    title="Actualizar con SQL en tiempo real"
                  >
                    🔄
                  </button>
                  <a
                    href={finalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-2"
                    title="Abrir en nueva pestaña"
                  >
                    <LuExternalLink size={16} />
                  </a>
                  <button
                    onClick={() => setPreview(finalUrl)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2"
                    title="Vista ampliada"
                  >
                    <LuMaximize2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* snack & modal */}
      <Snack msg={snack} onClose={() => setSnack('')} />
      <Modal url={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
