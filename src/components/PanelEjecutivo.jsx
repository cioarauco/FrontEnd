
import React, { useEffect, useState } from 'react';
import { supabase } from '../App';

export default function PanelEjecutivo() {
  const [datos, setDatos] = useState({
    produccion_total: 0,
    despachos_totales: 0,
    stock_predios: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: produccion } = await supabase.from('produccion').select('volumen').limit(10000);
        const { data: despachos } = await supabase.from('despachos').select('volumen').limit(10000);
        const { data: stock } = await supabase.from('stock_predios').select('volumen').limit(10000);

        const totalProduccion = produccion?.reduce((acc, p) => acc + Number(p.volumen || 0), 0) || 0;
        const totalDespachos = despachos?.reduce((acc, d) => acc + Number(d.volumen || 0), 0) || 0;
        const totalStock = stock?.reduce((acc, s) => acc + Number(s.volumen || 0), 0) || 0;

        setDatos({
          produccion_total: totalProduccion,
          despachos_totales: totalDespachos,
          stock_predios: totalStock,
        });
      } catch (error) {
        console.error("Error cargando métricas:", error.message);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto bg-white/90 dark:bg-[#1c2e1f]/90 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg mt-6">
      <h2 className="text-2xl font-bold mb-4 text-[#5E564D] dark:text-white">📊 Panel Ejecutivo Forestal</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Producción Total" value={datos.produccion_total} />
        <MetricCard title="Despachos Totales" value={datos.despachos_totales} />
        <MetricCard title="Stock en Predios" value={datos.stock_predios} />
      </div>
    </div>
  );
}

function MetricCard({ title, value }) {
  return (
    <div className="bg-[#DFA258] text-black dark:bg-[#2e2b26] dark:text-white p-6 rounded-lg shadow flex flex-col items-center justify-center">
      <div className="text-xl font-semibold">{title}</div>
      <div className="text-3xl font-bold mt-2">{value.toLocaleString()}</div>
    </div>
  );
}
