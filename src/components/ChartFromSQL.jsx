// src/components/ChartFromSQL.jsx
import React, { useEffect, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import { supabase } from '../App';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

export default function ChartFromSQL({ grafico_id }) {
  const [meta, setMeta] = useState(null);
  const [labels, setLabels] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAndRender = async () => {
    setLoading(true);
    const { data: grafico } = await supabase.from("graficos").select("*").eq("id", grafico_id).single();
    if (!grafico) return;

    setMeta(grafico);

    try {
      const result = await supabase.rpc("run_query", { sql: grafico.sql });
      const rows = result.data;

      if (grafico.chart_type === "multi-line") {
        const labelsSet = new Set();
        const seriesMap = {};

        rows.forEach(row => {
          labelsSet.add(row.label);
          if (!seriesMap[row.serie]) seriesMap[row.serie] = [];
          seriesMap[row.serie].push(row.value);
        });

        setLabels(Array.from(labelsSet));
        setSeries(Object.entries(seriesMap).map(([name, data]) => ({
          label: name,
          data,
          borderWidth: 2
        })));
      } else {
        setLabels(rows.map(r => r.label));
        setSeries([{ label: grafico.title, data: rows.map(r => r.value), backgroundColor: 'rgba(255, 99, 132, 0.5)' }]);
      }
    } catch (e) {
      console.error("Error al ejecutar la SQL:", e.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAndRender();
  }, [grafico_id]);

  const Chart = meta?.chart_type === "line" || meta?.chart_type === "multi-line" ? Line : Bar;

  if (loading) return <div className="text-sm text-gray-500">Cargando gráfico...</div>;

  return (
    <div className="mt-4">
      <Chart
        data={{ labels, datasets: series }}
        options={{
          responsive: true,
          plugins: {
            legend: { position: "top" },
            title: { display: true, text: meta?.title || "Gráfico" }
          }
        }}
      />
      <button onClick={fetchAndRender} className="mt-2 bg-[#DFA258] hover:bg-[#c79046] text-black px-3 py-1 rounded text-xs shadow">
        🔄 Actualizar gráfico
      </button>
    </div>
  );
}
