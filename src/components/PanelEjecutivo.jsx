import React, { useEffect, useState } from 'react';
import { supabase } from '@/App';
import Plot from 'react-plotly.js';
import { FaChartBar } from 'react-icons/fa';

export default function PanelEjecutivo() {
  const [produccion, setProduccion] = useState(0);
  const [despachos, setDespachos] = useState(0);
  const [stock, setStock] = useState(0);
  const [dfProduccion, setDfProduccion] = useState([]);
  const [dfDespachos, setDfDespachos] = useState([]);
  const [dfStock, setDfStock] = useState([]);
  const [dfProyecciones, setDfProyecciones] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const prod = await supabase.from('produccion').select('*');
      const desp = await supabase.from('despachos').select('*');
      const sto = await supabase.from('stock_predios').select('*');
      const proy = await supabase.from('proyecciones').select('*');

      if (prod.data) {
        setProduccion(prod.data.reduce((a, b) => a + (b.volumen || 0), 0));
        setDfProduccion(prod.data);
      }
      if (desp.data) {
        setDespachos(desp.data.reduce((a, b) => a + (b.volumen || 0), 0));
        setDfDespachos(desp.data);
      }
      if (sto.data) {
        setStock(sto.data.reduce((a, b) => a + (b.volumen || 0), 0));
        setDfStock(sto.data);
      }
      if (proy.data) {
        setDfProyecciones(proy.data);
      }
    };
    fetchData();
  }, []);

  const dataComparativaPorTeam = () => {
    const grupos = {};
    dfProduccion.forEach(p => {
      if (!grupos[p.team]) grupos[p.team] = { produccion: 0, proyeccion: 0 };
      grupos[p.team].produccion += p.volumen;
    });
    dfProyecciones.forEach(p => {
      if (!grupos[p.team]) grupos[p.team] = { produccion: 0, proyeccion: 0 };
      grupos[p.team].proyeccion += p.volumen_proyectado;
    });
    const teams = Object.keys(grupos);
    const produccion = teams.map(t => grupos[t].produccion);
    const proyeccion = teams.map(t => grupos[t].proyeccion);
    return { teams, produccion, proyeccion };
  };

  const dataComparativaPorFecha = () => {
    const fechas = {};
    dfProduccion.forEach(p => {
      const fecha = p.fecha?.split('T')[0];
      if (!fechas[fecha]) fechas[fecha] = { produccion: 0, proyeccion: 0 };
      fechas[fecha].produccion += p.volumen;
    });
    dfProyecciones.forEach(p => {
      const fecha = p.fecha?.split('T')[0];
      if (!fechas[fecha]) fechas[fecha] = { produccion: 0, proyeccion: 0 };
      fechas[fecha].proyeccion += p.volumen_proyectado;
    });
    const ordenadas = Object.entries(fechas).sort(([a], [b]) => new Date(a) - new Date(b));
    const fechasOrdenadas = ordenadas.map(([f]) => f);
    const prod = ordenadas.map(([_, v]) => v.produccion);
    const proy = ordenadas.map(([_, v]) => v.proyeccion);
    return { fechas: fechasOrdenadas, prod, proy };
  };

  const dataStockPorZona = () => {
    const zonas = {};
    dfStock.forEach(s => {
      if (!zonas[s.zona]) zonas[s.zona] = 0;
      zonas[s.zona] += s.volumen;
    });
    const labels = Object.keys(zonas);
    const values = Object.values(zonas);
    return { labels, values };
  };

  const dataStockPorCalidad = () => {
    const calidades = {};
    dfStock.forEach(s => {
      if (!calidades[s.calidad]) calidades[s.calidad] = 0;
      calidades[s.calidad] += s.volumen;
    });
    const labels = Object.keys(calidades);
    const values = Object.values(calidades);
    return { labels, values };
  };

  const { teams, produccion: prodTeam, proyeccion: proyTeam } = dataComparativaPorTeam();
  const { fechas, prod, proy } = dataComparativaPorFecha();
  const stockZona = dataStockPorZona();
  const stockCalidad = dataStockPorCalidad();

  return (
    <div className="min-h-screen bg-[url('/fondo-forestal-pro.jpg')] bg-cover bg-fixed bg-center p-6">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex justify-between items-center bg-white/90 dark:bg-[#1c2e1f]/90 px-6 py-3 rounded-xl shadow border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#d6943c] text-black text-center rounded-xl shadow p-6">
            <div className="text-lg font-semibold">Producción Total</div>
            <div className="text-2xl font-bold mt-2">{produccion.toLocaleString('es-CL')}</div>
          </div>
          <div className="bg-[#d6943c] text-black text-center rounded-xl shadow p-6">
            <div className="text-lg font-semibold">Despachos Totales</div>
            <div className="text-2xl font-bold mt-2">{despachos.toLocaleString('es-CL')}</div>
          </div>
          <div className="bg-[#d6943c] text-black text-center rounded-xl shadow p-6">
            <div className="text-lg font-semibold">Stock en Predios</div>
            <div className="text-2xl font-bold mt-2">{stock.toLocaleString('es-CL')}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white/90 dark:bg-[#1c2e1f]/90 rounded-xl shadow-lg p-4">
            <h2 className="text-center text-lg font-semibold mb-2">Comparativa Producción vs Proyección - por Team</h2>
            <Plot
              data={[
                { x: teams, y: prodTeam, name: 'Producción', type: 'bar' },
                { x: teams, y: proyTeam, name: 'Proyección', type: 'bar' },
              ]}
              layout={{ barmode: 'group', height: 350, margin: { t: 30 }, xaxis: { tickangle: -45 } }}
              useResizeHandler
              style={{ width: '100%' }}
            />
          </div>

          <div className="bg-white/90 dark:bg-[#1c2e1f]/90 rounded-xl shadow-lg p-4">
            <h2 className="text-center text-lg font-semibold mb-2">Comparativa Producción vs Proyección - por Fecha</h2>
            <Plot
              data={[
                { x: fechas, y: prod, name: 'Producción', type: 'scatter', mode: 'lines+markers' },
                { x: fechas, y: proy, name: 'Proyección', type: 'scatter', mode: 'lines+markers' },
              ]}
              layout={{ height: 350, margin: { t: 30 } }}
              useResizeHandler
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white/90 dark:bg-[#1c2e1f]/90 rounded-xl shadow-lg p-4">
            <h2 className="text-center text-lg font-semibold mb-2">Stock por Zona</h2>
            <Plot
              data={[{ x: stockZona.labels, y: stockZona.values, type: 'bar', marker: { color: '#FF6347' } }]}
              layout={{ height: 350, margin: { t: 30 }, xaxis: { tickangle: -45 } }}
              useResizeHandler
              style={{ width: '100%' }}
            />
          </div>

          <div className="bg-white/90 dark:bg-[#1c2e1f]/90 rounded-xl shadow-lg p-4">
            <h2 className="text-center text-lg font-semibold mb-2">Stock por Calidad</h2>
            <Plot
              data={[{ x: stockCalidad.labels, y: stockCalidad.values, type: 'bar', marker: { color: '#9370DB' } }]}
              layout={{ height: 350, margin: { t: 30 }, xaxis: { tickangle: -45 } }}
              useResizeHandler
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
