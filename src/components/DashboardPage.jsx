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

  if (loading) return <p className="text-center">Cargando dashboards...</p>;
  if (!dashboards.length) return <p className="text-center">No tienes gráficos guardados todavía.</p>;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">📊 Mis Dashboards</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {dashboards.map((item) => (
          <div key={item.id} className="bg-white border rounded-lg shadow-md overflow-hidden relative">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">{item.titulo}</h3>
              <p className="text-sm text-gray-500">Guardado el: {new Date(item.fecha).toLocaleString()}</p>
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={() => editarTitulo(item.id, item.titulo)}
                  className="bg-yellow-400 hover:bg-yellow-500 text-white text-xs px-2 py-1 rounded"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => eliminarDashboard(item.id)}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                >
                  🗑️ Eliminar
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
    </div>
  );
}
