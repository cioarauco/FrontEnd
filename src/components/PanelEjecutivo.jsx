import React, { useEffect, useState } from 'react';
import { supabase } from '@/App';
import Plot from 'react-plotly.js';
import { FaChartBar } from 'react-icons/fa';

export default function PanelEjecutivo() {
  const [produccion, setProduccion] = useState(0);
  const [despachos, setDespachos] = useState(0);
  const [stock, setStock] = useState(0);
  const [comparativaTeam, setComparativaTeam] = useState([]);
  const [comparativaFecha, setComparativaFecha] = useState([]);
  const [comparativaCalidad, setComparativaCalidad] = useState([]);
  const [comparativaDestino, setComparativaDestino] = useState([]);
  const [comparativaLargo, setComparativaLargo] = useState([]);
  const [stockZona, setStockZona] = useState([]);
  const [stockCalidad, setStockCalidad] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const prod = await supabase.from('produccion').select('*');
      const desp = await supabase.from('despachos').select('*');
      const sto = await supabase.from('stock_predios').select('*');
      const team = await supabase.from('comparativa_produccion_teams').select('*');
      const fecha = await supabase.from('comparativa_produccion_fechas').select('*');
      const calidad = await supabase.from('comparativa_produccion_calidad').select('*');
      const destino = await supabase.from('comparativa_despachos_destino').select('*');
      const largo = await supabase.from('comparativa_despachos_largo').select('*');
      const zona = await supabase.from('stock_predios_zona').select('*');
      const cali = await supabase.from('stock_predios_calidad').select('*');

      if (prod.data) setProduccion(prod.data.reduce((a, b) => a + (b.volumen || 0), 0));
      if (desp.data) setDespachos(desp.data.reduce((a, b) => a + (b.volumen || 0), 0));
      if (sto.data) setStock(sto.data.reduce((a, b) => a + (b.volumen || 0), 0));
      if (team.data) setComparativaTeam(team.data);
      if (fecha.data) setComparativaFecha(fecha.data);
      if (calidad.data) setComparativaCalidad(calidad.data);
      if (destino.data) setComparativaDestino(destino.data);
      if (largo.data) setComparativaLargo(largo.data);
      if (zona.data) setStockZona(zona.data);
      if (cali.data) setStockCalidad(cali.data);
    };
    fetchData();
  }, []);

  const renderComparativaBar = (df, x, y1, y2, label) => (
    <div className="bg-white/90 dark:bg-[#1c2e1f]/90 rounded-xl shadow-lg p-4">
      <h2 className="text-center text-lg font-semibold mb-2">{label}</h2>
      <Plot
        data={[
          {
            x: df.map(d => d[x]),
            y: df.map(d => d[y1]),
            name: 'Real',
            type: 'bar',
            marker: { color: '#006d77' }
          },
          {
            x: df.map(d => d[x]),
            y: df.map(d => d[y2]),
            name: 'Planificado',
            type: 'bar',
            marker: { color: '#ffb703' }
          }
        ]}
        layout={{
          barmode: 'group',
          margin: { t: 30 },
          xaxis: { title: x, tickangle: -45 },
          yaxis: { title: 'Volumen (m³)' },
          height: 350
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />
    </div>
  );

  const renderSimpleBar = (df, x, y, label, color) => (
    <div className="bg-white/90 dark:bg-[#1c2e1f]/90 rounded-xl shadow-lg p-4">
      <h2 className="text-center text-lg font-semibold mb-2">{label}</h2>
      <Plot
        data={[{
          x: df.map(d => d[x]),
          y: df.map(d => d[y]),
          type: 'bar',
          marker: { color: color }
        }]}
        layout={{
          margin: { t: 30 },
          xaxis: { title: x, tickangle: -45 },
          yaxis: { title: 'Volumen (m³)' },
          height: 350
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[url('/fondo-forestal-pro.jpg')] bg-cover bg-fixed bg-center p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center bg-white/90 dark:bg-[#1c2e1f]/90 px-6 py-3 rounded-xl shadow mb-6 border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <FaChartBar className="text-2xl text-[#D2C900]" />
            <span className="text-xl font-serif font-bold text-[#5E564D] dark:text-white">
              Panel Ejecutivo Forestal
            </span>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <a href="/chat" className="text-[#5E564D] dark:text-white hover:underline">🌲 Chat Tronix</a>
            <a href="/dashboards" className="text-[#5E564D] dark:text-white hover:underline">📊 Mis Dashboards</a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[['Producción Total', produccion], ['Despachos Totales', despachos], ['Stock en Predios', stock]].map(([label, val], i) => (
            <div key={i} className="bg-[#d6943c] text-black text-center rounded-xl shadow p-6">
              <div className="text-lg font-semibold">{label}</div>
              <div className="text-2xl font-bold mt-2">{val.toLocaleString('es-CL')}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {renderComparativaBar(comparativaTeam, 'team', 'volumen_real', 'volumen_proyectado', 'Comparativa Producción vs Proyección - por Team')}
          {renderComparativaBar(comparativaFecha, 'fecha', 'volumen_real', 'volumen_proyectado', 'Comparativa Producción vs Proyección - por Fecha')}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {renderComparativaBar(comparativaCalidad, 'calidad', 'volumen_real', 'volumen_proyectado', 'Producción vs Proyección por Calidad')}
          {renderComparativaBar(comparativaDestino, 'destino', 'volumen_despachado', 'volumen_planificado', 'Despachos por Destino')}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {renderComparativaBar(comparativaLargo, 'largo', 'volumen_despachado', 'volumen_planificado', 'Despachos por Largo')}
          {renderSimpleBar(stockZona, 'zona', 'volumen', 'Stock por Zona', '#ef476f')}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {renderSimpleBar(stockCalidad, 'calidad', 'volumen', 'Stock por Calidad', '#9b5de5')}
        </div>
      </div>
    </div>
  );
}
