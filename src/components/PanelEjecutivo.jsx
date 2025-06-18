import React, { useEffect, useState } from 'react';
import { supabase } from '../App';
import { FaTree } from 'react-icons/fa';
import Plot from 'react-plotly.js';

export default function PanelEjecutivo() {
  const [produccionData, setProduccionData] = useState([]);
  const [despachosData, setDespachosData] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [zonaFiltro, setZonaFiltro] = useState('');

  useEffect(() => {
    fetchData();
  }, [zonaFiltro]);

  const fetchData = async () => {
    const p = await supabase.from('comparativa_produccion_teams').select('*');
    const d = await supabase.from('comparativa_despachos').select('*');
    const s = await supabase.from('vista_stock_predios').select('*');

    if (!p.error) setProduccionData(p.data);
    if (!d.error) setDespachosData(d.data);
    if (!s.error) setStockData(s.data);
  };

  const zonas = [...new Set(stockData.map((d) => d.zona))];

  const renderGraficoProduccion = () => {
    const filtered = zonaFiltro ? produccionData.filter(d => d.zona === zonaFiltro) : produccionData;
    const fechas = [...new Set(filtered.map(d => d.fecha))];
    const teams = [...new Set(filtered.map(d => d.team))];

    const traces = teams.map(team => {
      const teamData = filtered.filter(d => d.team === team);
      return {
        x: teamData.map(d => d.fecha),
        y: teamData.map(d => d.volumen_real),
        name: team,
        type: 'bar'
      };
    });

    return (
      <Plot
        data={traces}
        layout={{ title: 'Producción Real por Team', barmode: 'group', margin: { t: 40, b: 60 } }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    );
  };

  const renderGraficoDespachos = () => {
    const filtered = zonaFiltro ? despachosData.filter(d => d.zona === zonaFiltro) : despachosData;
    return (
      <Plot
        data={[{
          x: filtered.map(d => `${d.mes}/${d.anio}`),
          y: filtered.map(d => d.volumen_despachado),
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Despachos'
        }]}
        layout={{ title: 'Despachos por Mes', margin: { t: 40, b: 60 } }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    );
  };

  const renderGraficoStock = () => {
    const filtered = zonaFiltro ? stockData.filter(d => d.zona === zonaFiltro) : stockData;
    const porZona = filtered.reduce((acc, cur) => {
      acc[cur.zona] = (acc[cur.zona] || 0) + cur.volumen;
      return acc;
    }, {});

    return (
      <Plot
        data={[{
          labels: Object.keys(porZona),
          values: Object.values(porZona),
          type: 'pie'
        }]}
        layout={{ title: 'Distribución de Stock por Zona', margin: { t: 40, b: 60 } }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[url('/fondo-forestal-pro.jpg')] bg-cover bg-fixed bg-center p-6">
      <div className="flex justify-between items-center bg-white/90 dark:bg-[#1c2e1f]/90 px-6 py-3 rounded-xl shadow mb-6 max-w-6xl mx-auto border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <FaTree className="text-2xl text-[#D2C900]" />
          <span className="text-xl font-serif font-bold text-[#5E564D] dark:text-white">Panel Ejecutivo Forestal</span>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <a href="/chat" className="text-[#5E564D] dark:text-white hover:underline">🌲 Chat Tronix</a>
          <a href="/dashboards" className="text-[#5E564D] dark:text-white hover:underline">📊 Dashboards</a>
          <a href="/panel-ejecutivo" className="text-[#5E564D] dark:text-white hover:underline">📈 Panel Ejecutivo</a>
        </div>
      </div>

      <div className="bg-white/90 dark:bg-[#1c2e1f]/90 p-6 rounded-xl shadow-lg max-w-6xl mx-auto border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <div className="flex justify-center mb-4">
          <select
            className="p-2 border border-gray-300 rounded"
            value={zonaFiltro}
            onChange={(e) => setZonaFiltro(e.target.value)}
          >
            <option value="">Todas las Zonas</option>
            {zonas.map((zona) => (
              <option key={zona} value={zona}>{zona}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-4">
            {renderGraficoProduccion()}
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            {renderGraficoDespachos()}
          </div>
          <div className="bg-white rounded-lg shadow p-4 md:col-span-2">
            {renderGraficoStock()}
          </div>
        </div>
      </div>
    </div>
  );
}
