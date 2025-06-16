import React, { useEffect, useState } from 'react';
import { supabase } from '../App';

export default function DashboardPage() {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboards = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Debes iniciar sesión para ver tus dashboards.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('dashboards')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false });

    if (error) {
      alert('Error al cargar dashboards: ' + error.message);
    } else {
      setDashboards(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboards();
  }, []);

  const eliminarDashboard = async (id) => {
    const confirmar = window.confirm("¿Estás seguro de que quieres eliminar este gráfico?");
    if (!confirmar) return;

    const { error } = await supabase
      .from('dashboards')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      setDashboards(dashboards.filter(item => item.id !== id));
    }
  };

  const editarTitulo = async (id, tituloActual) => {
    const nuevoTitulo = window.prompt("Escribe el nuevo título para este gráfico:", tituloActual);
    if (!nuevoTitulo || nuevoTitulo.trim() === tituloActual.trim()) return;

    const { error } = await supabase
      .from('dashboards')
      .update({ titulo: nuevoTitulo })
      .eq('id', id);

    if (error) {
      alert('Error al actualizar título: ' + error.message);
    } else {
      setDashboards(dashboards.map(item =>
        item.id === id ? { ...item, titulo: nuevoTitulo } : item
      ));
    }
  };

  return (
    <div className="min-h-screen bg-[url('/fondo-forestal-pro.jpg')] bg-cover bg-fixed bg-center p-6">
      <div className="max-w-7xl mx-auto bg-white/90 dark:bg-[#1c2e1f]/90 backdrop-blur-sm p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[#5E564D] dark:text-white font-serif flex items-center gap-2">
            📊 Mis Dashboards Guardados
          </h2>
        </div>

        {loading ? (
          <p className="text-center text-gray-600 dark:text-gray-300">Cargando dashboards...</p>
        ) : dashboards.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 italic">
            Aún no tienes gráficos guardados. Usa el agente Tronix para generarlos y guárdalos aquí.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboards.map((item) => (
              <div key={item.id} className="bg-white dark:bg-[#2e2b26] border border-gray-200 dark:border-gray-600 rounded-lg shadow-md hover:shadow-xl transition overflow-hidden relative">
                <div className="p-4 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-[#5E564D] dark:text-white">{item.titulo}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Guardado el: {new Date(item.fecha).toLocaleString()}
                  </p>
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={() => editarTitulo(item.id, item.titulo)}
                      className="bg-yellow-400 hover:bg-yellow-500 text-white text-xs px-2 py-1 rounded"
                      title="Editar título"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => eliminarDashboard(item.id)}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                      title="Eliminar gráfico"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <iframe
                  src={item.url}
                  className="w-full"
                  style={{ height: '400px', border: 'none' }}
                  allowFullScreen
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

