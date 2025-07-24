// src/pages/DashboardPage.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../App';
import {
  // íconos lucide vía react-icons
  LuLoader,
  LuChevronDown,
  LuChevronUp,
  LuExternalLink,
  LuPencil,
  LuTrash2,
  LuX,
  LuMaximize2
} from 'react-icons/lu';

/* utils ─────────────────────────────────────────────────────── */
const toCL = n => new Date(n).toLocaleString('es-CL');
const cls  = (...c) => c.filter(Boolean).join(' ');

/* Snackbar para feedback */
function Snack({ msg, onClose }) {
  if (!msg) return null;
  return (
    <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-4 py-2 rounded shadow-lg flex items-center gap-2 animate-fade-in">
      {msg}
      <button onClick={onClose} className="ml-2 hover:text-yellow-300">
        <LuX size={16}/>
      </button>
    </div>
  );
}

/* Modal preview (vista ampliada) */
function Modal({ url, onClose }) {
  if (!url) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1c2e1f] w-[90%] h-[90%] rounded-lg shadow-xl overflow-hidden relative">
        {/* botón de cierre visible  */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-white/20 hover:bg-white/40 rounded-full p-1"
          title="Cerrar"
        >
          <LuX size={20} className="text-white"/>
        </button>
        <iframe src={url} className="w-full h-full border-none" allowFullScreen/>
      </div>
    </div>
  );
}

/* Tarjeta fantasma (loading) */
const CardSkeleton = () => (
  <div className="animate-pulse bg-white/60 dark:bg-[#2e2b26] rounded-lg h-[460px]"/>
);

/* ───────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading]       = useState(true);

  /* UI state */
  const [search, setSearch]         = useState('');
  const [order,  setOrder]          = useState('desc');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo,   setDateTo]       = useState('');
  const [snack,    setSnack]        = useState('');
  const [preview,  setPreview]      = useState(null);   // url en modal
  const [refreshKeys, setRefreshKeys] = useState({});


  /* ────────── fetch dashboards ────────── */
  const fetchDashboards = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('dashboards')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha', { ascending: order === 'asc' });

    if (error) console.error(error);
    else setDashboards(data);

    setLoading(false);
  };

  useEffect(() => { fetchDashboards(); }, [order]);

  /* ────────── acciones CRUD ────────── */
  const eliminarDashboard = async (id) => {
    if (!window.confirm("¿Eliminar este gráfico?")) return;
    const { error } = await supabase.from('dashboards').delete().eq('id', id);
    if (!error) {
      setDashboards(dashboards.filter(d => d.id !== id));
      setSnack('Gráfico eliminado');
    }
  };

  const editarTitulo = async (id, actual) => {
    const nuevo = window.prompt("Nuevo título:", actual)?.trim();
    if (!nuevo || nuevo === actual) return;
    const { error } = await supabase.from('dashboards').update({ titulo: nuevo }).eq('id', id);
    if (!error) {
      setDashboards(dashboards.map(d => d.id === id ? { ...d, titulo: nuevo } : d));
      setSnack('Título actualizado');
    }
  };

  /* ────────── filtros locales ────────── */
  const filtered = dashboards.filter(d => {
    const matchTitle = d.titulo.toLowerCase().includes(search.toLowerCase());
    const fecha = new Date(d.fecha);
    const inRange =
      (!dateFrom || fecha >= new Date(dateFrom)) &&
      (!dateTo   || fecha <= new Date(dateTo));
    return matchTitle && inRange;
  });

  /* ────────── manejar Enter en búsqueda ────────── */
  const handleSearchKey = (e) => {
    if (e.key === 'Enter') e.preventDefault();   // evita recarga y “submit”
  };

  /* ────────── UI ────────── */
  return (
    <div className="min-h-screen bg-[url('/fondo-forestal-pro.jpg')] bg-cover bg-fixed bg-center p-6">
      {/* Header */}
      <header className="flex justify-between items-center bg-white/90 dark:bg-[#1c2e1f]/90 px-6 py-3 rounded-xl shadow mb-6 max-w-7xl mx-auto border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌲</span>
          <span className="text-xl font-serif font-bold text-[#5E564D] dark:text-white">
            Tronix Forest Assistant
          </span>
        </div>
        <nav className="flex gap-4 text-sm font-medium">
          <a href="/chat"       className="hover:underline text-[#5E564D] dark:text-white">🌲 Chat Tronix</a>
          <a href="/dashboards" className="hover:underline text-[#5E564D] dark:text-white">📊 Mis Dashboards</a>
          <a href="/panel-ejecutivo"  className="hover:underline text-[#5E564D] dark:text-white">📈 Panel Ejecutivo</a>
          <a
            href="/"
            onClick={() => supabase.auth.signOut()}
            className="hover:underline text-[#5E564D] dark:text-red-400"
          >
            🚪 Cerrar sesión
          </a>
        </nav>
      </header>

      {/* Contenedor principal */}
      <section className="max-w-7xl mx-auto bg-white/90 dark:bg-[#1c2e1f]/90 backdrop-blur-sm p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
        {/* título + controles */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-[#5E564D] dark:text-white font-serif flex items-center gap-2">
            📊 Mis Dashboards Guardados
          </h2>

          {/* filtros */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              placeholder="Buscar título..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchKey}
              className="border px-3 py-1 rounded text-sm bg-white dark:bg-[#2e2b26]"
            />
            <div className="flex items-center gap-1 text-sm">
              Desde <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="border rounded px-2 py-1 bg-white dark:bg-[#2e2b26]"/>
              Hasta <input type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}   className="border rounded px-2 py-1 bg-white dark:bg-[#2e2b26]"/>
            </div>
            <button
              onClick={() => setOrder(o => o === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1 border px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-sm">
              Orden {order === 'asc' ? 'antiguo→nuevo' : 'nuevo→antiguo'}
              {order === 'asc' ? <LuChevronUp size={14}/> : <LuChevronDown size={14}/>}
            </button>
          </div>
        </div>

        {/* listado */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_,i)=><CardSkeleton key={i}/>)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 italic">
            {dashboards.length === 0
              ? 'Aún no tienes gráficos guardados. Usa el agente Tronix para crearlos.'
              : 'Ningún gráfico coincide con tu búsqueda/filtro.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(item => (
              <div key={item.id} className="bg-white dark:bg-[#2e2b26] border border-gray-200 dark:border-gray-600 rounded-lg shadow-md hover:shadow-xl transition overflow-hidden relative group">
                {/* header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[#5E564D] dark:text-white line-clamp-2">{item.titulo}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Guardado: {toCL(item.fecha)}</p>
                  </div>
                  {/* acciones */}
                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => editarTitulo(item.id, item.titulo)} className="bg-yellow-400 hover:bg-yellow-500 rounded p-1" title="Editar título">
                      <LuPencil size={16} className="text-white"/>
                    </button>
                    <button onClick={() => eliminarDashboard(item.id)} className="bg-red-500 hover:bg-red-600 rounded p-1" title="Eliminar">
                      <LuTrash2 size={16} className="text-white"/>
                    </button>
                  </div>
                </div>

                {/* iframe */}
                <iframe
                  key={refreshKeys[item.id] || item.id}  // 👈 esta es la clave para forzar el remount
                  src={item.url}
                  className="w-full"
                  style={{ height: '400px', border: 'none' }}
                  allowFullScreen
                  loading="lazy"
                />

                {/* overlay */}
                <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => {
                      // Añade ?actualizar=true o &actualizar=true según corresponda
                      const updatedUrl = item.url.includes("?")
                        ? item.url + "&actualizar=true"
                        : item.url + "?actualizar=true";

                       // Forzamos re-mount del iframe con clave nueva y nueva URL
                      setRefreshKeys(prev => ({
                        ...prev,
                        [item.id]: Math.random().toString(),
                        }));

                      // Actualizamos la URL del gráfico solo para este render
                      setDashboards(current =>
                        current.map(d =>
                          d.id === item.id ? { ...d, url: updatedUrl } : d
                        )
                      );
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-2"
                    title="Actualizar con SQL en tiempo real"
                  >
                    🔄
                  </button>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-2" title="Abrir en nueva pestaña">
                    <LuExternalLink size={16}/>
                  </a>
                  <button onClick={() => setPreview(item.url)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2" title="Vista ampliada">
                    <LuMaximize2 size={16}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Snack & Modal */}
      <Snack msg={snack} onClose={() => setSnack('')}/>
      <Modal url={preview} onClose={() => setPreview(null)}/>
    </div>
  );
}
