import React, { useEffect, useState } from 'react';
import { supabase } from '../App';
import { Line, Bar } from 'react-chartjs-2';
import { LuTrash2, LuRefreshCw } from 'react-icons/lu';

/* feedback snack */
function Snack({ msg, onClose }) {
  if (!msg) return null;
  return (
    <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded shadow-lg animate-fade-in">
      {msg}
      <button onClick={onClose} className="ml-2">✕</button>
    </div>
  );
}

export default function DashboardPage() {
  const [graficos, setGraficos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState('');

  useEffect(() => {
    cargarDashboard();
  }, []);

  const cargarDashboard = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setLoading(false);
    return;
  }

  const { data, error } = await supabase
    .from('dashboard')
    .select('id, graficos(*)')
    .eq('user_id', user.id);

  if (error) {
    console.error(error);
  } else {
    setGraficos(data.map((d) => d.graficos));
  }

  setLoading(false);
};

  const eliminarGrafico = async (id) => {
    if (!window.confirm('¿Eliminar este gráfico del dashboard?')) return;

    const { error } = await supabase
      .from('dashboard')
      .delete()
      .eq('grafico_id', id);

    if (!error) {
      setGraficos(graficos.filter((g) => g.id !== id));
      setSnack('Gráfico eliminado del dashboard.');
    }
  };

  const actualizarGrafico = async (id) => {
    const { data: grafico, error } = await supabase
      .from('graficos')
      .select('sql')
      .eq('id', id)
      .single();

    if (error) {
      alert('Error obteniendo SQL: ' + error.message);
      return;
    }

    const { data: nuevosDatos, error: errorSQL } = await supabase.rpc('run_query', { sql: grafico.sql });

    if (errorSQL) {
      alert('Error ejecutando SQL: ' + errorSQL.message);
      return;
    }

    const { error: errorUpdate } = await supabase
      .from('graficos')
      .update({ values: nuevosDatos })
      .eq('id', id);

    if (errorUpdate) {
      alert('Error actualizando gráfico: ' + errorUpdate.message);
    } else {
      setSnack('Gráfico actualizado correctamente.');
      cargarDashboard();
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Cargando gráficos...</div>;
  }

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <h2 className="text-2xl font-bold mb-4">📊 Mis Dashboards</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {graficos.map((grafico) => (
          <div key={grafico.id} className="bg-white p-4 rounded-lg shadow-md h-[400px]">
            <h3 className="text-lg font-semibold mb-2">{grafico.title}</h3>

            {grafico.chart_type === 'line' && (
              <Line
                data={{
                  labels: grafico.labels,
                  datasets: grafico.values.map((serie, idx) => ({
                    label: serie.label,
                    data: serie.data,
                    borderColor: `rgba(${100 + idx * 50}, ${100 + idx * 30}, ${200 - idx * 30}, 1)`,
                    backgroundColor: `rgba(${100 + idx * 50}, ${100 + idx * 30}, ${200 - idx * 30}, 0.5)`,
                    fill: false,
                    tension: 0.3,
                  })),
                }}
                options={{ responsive: true, maintainAspectRatio: false }}
              />
            )}

            {grafico.chart_type === 'bar' && (
              <Bar
                data={{
                  labels: grafico.labels,
                  datasets: grafico.values.map((serie) => ({
                    label: serie.label,
                    data: serie.data,
                    backgroundColor: `rgba(${150 + idx * 20}, ${80 + idx * 40}, ${150 - idx * 30}, 0.7)`,
                  })),
                }}
                options={{ responsive: true, maintainAspectRatio: false }}
              />
            )}

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => actualizarGrafico(grafico.id)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-1"
              >
                <LuRefreshCw /> Actualizar
              </button>
              <button
                onClick={() => eliminarGrafico(grafico.id)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded flex items-center gap-1"
              >
                <LuTrash2 /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      <Snack msg={snack} onClose={() => setSnack('')} />
    </div>
  );
}
