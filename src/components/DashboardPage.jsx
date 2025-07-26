// src/pages/DashboardPage.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../App';

// Chart.js (auto‑register todos los elementos)
import { Line, Bar } from 'react-chartjs-2';
import 'chart.js/auto';

/* ───────────────────────── helpers ───────────────────────── */
const cls = (...c) => c.filter(Boolean).join(' ');

export default function DashboardPage() {
  const [graficos, setGraficos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(null); // id del gráfico que se está refrescando

  /* ───────────────────── carga inicial ───────────────────── */
  useEffect(() => {
    (async () => {
      // 1️⃣ Obtenemos dashboards del usuario + gráfico asociado
      const { data, error } = await supabase
        .from('dashboard')
        .select(`
          id,
          created_at,
          graficos:grafico_id (
            id, title, chart_type, labels, values, sql
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[DashboardPage] Error al listar dashboards:', error);
        setCargando(false);
        return;
      }

      // 2️⃣ Convertimos a un array plano de gráficos
      const limpios = data
        .filter(d => d.graficos)
        .map(d => {
          const g = d.graficos;
          return {
            ...g,
            dashboard_id: d.id,
            created_at: d.created_at,
            // Garantizamos que labels/values sean arrays
            labels: Array.isArray(g.labels) ? g.labels
                    : JSON.parse(g.labels ?? '[]'),
            values: Array.isArray(g.values) ? g.values
                    : JSON.parse(g.values ?? '[]')
          };
        });

      setGraficos(limpios);
      setCargando(false);
    })();
  }, []);

  /* ─────────────── refrescar un gráfico vía SQL ───────────── */
  async function handleUpdate(grafico) {
    if (!grafico.sql) {
      alert('Este gráfico no tiene SQL asociada para actualizar.');
      return;
    }
    setActualizando(grafico.id);

    try {
      // Llama a tu RPC "run_query" (ajusta el nombre si difiere)
      const { data, error } = await supabase
        .rpc('run_query', { sql: grafico.sql });

      if (error) throw error;
      if (!data?.length) {
        alert('La consulta no devolvió resultados.');
        return;
      }

      // ⚠️ Aquí asumo que tu RPC devuelve un objeto con
      // { labels: [...], values: [...] } del mismo formato original.
      // Ajusta el mapeo si tu función responde distinto.
      const newLabels = data[0].labels || [];
      const newValues = data[0].values || [];

      setGraficos(prev =>
        prev.map(g =>
          g.id === grafico.id
            ? { ...g, labels: newLabels, values: newValues }
            : g
        )
      );
    } catch (err) {
      console.error('[DashboardPage] Error al actualizar gráfico:', err);
      alert('No se pudo actualizar el gráfico. Revisa la consola.');
    } finally {
      setActualizando(null);
    }
  }

  /* ───────────────────────── render ───────────────────────── */
  if (cargando) {
    return (
      <div className="p-6 min-h-screen bg-gray-100 flex items-center justify-center">
        ⏳ Cargando dashboards…
      </div>
    );
  }

  if (!graficos.length) {
    return (
      <div className="p-6 min-h-screen bg-gray-100 flex items-center justify-center">
        Aún no tienes gráficos guardados.
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <h2 className="text-2xl font-bold mb-4">📊 Mis Dashboards</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {graficos.map(grafico => {
          const chartData = {
            labels: grafico.labels,
            datasets: grafico.values.map((serie, idx) => ({
              label: serie.label ?? `Serie ${idx + 1}`,
              data: serie.data,
              borderWidth: 2,
            })),
          };

          return (
            <div
              key={grafico.id}
              className="bg-white p-4 rounded-lg shadow-md flex flex-col"
            >
              {/* título + botón actualizar */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">{grafico.title}</h3>
                <button
                  onClick={() => handleUpdate(grafico)}
                  className={cls(
                    'text-sm px-3 py-1 rounded border',
                    actualizando === grafico.id
                      ? 'bg-gray-300 cursor-wait'
                      : 'bg-blue-100 hover:bg-blue-200'
                  )}
                  disabled={actualizando === grafico.id}
                >
                  🔄 {actualizando === grafico.id ? 'Actualizando…' : 'Actualizar'}
                </button>
              </div>

              {/* contenedor del gráfico */}
              <div className="flex-1">
                {grafico.chart_type === 'line' && (
                  <Line options={{ maintainAspectRatio: false }} data={chartData} />
                )}
                {grafico.chart_type === 'bar' && (
                  <Bar options={{ maintainAspectRatio: false }} data={chartData} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
