// src/components/PanelEjecutivo.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../App';
import Plot from 'react-plotly.js';

const verde = '#00563F';
const naranja = '#DFA258';

export default function PanelEjecutivo() {
  /* ─────────────────────────  state  ───────────────────────── */
  const [metricas, setMetricas] = useState({
    produccionTotal: 0,
    despachosTotales: 0,
    stockPredios: 0
  });

  const [charts, setCharts] = useState({
    team: null,
    fecha: null,
    calidadProd: null,
    despachoDestino: null,
    despachoLargo: null,
    despachoCalidad: null,
    stockZona: null,
    stockCalidad: null
  });

  /* ────────────────────────  fetch data  ───────────────────── */
  useEffect(() => {
    (async () => {
      /* 1️⃣ Producción vs Proyección – Teams -------------------------------- */
      const { data: prodRaw } = await supabase
        .from('comparativa_produccion_teams')
        .select('team, fecha, calidad, produccion_total, volumen_proyectado');

      /* Agrupaciones rápidas  */
      const prodPorTeam = {};
      const prodPorFecha = {};
      const prodPorCalidad = {};

      let produccionAcum = 0;
      let proyeccionAcum = 0;

      prodRaw?.forEach(r => {
        // Team
        prodPorTeam[r.team] ??= { real: 0, proj: 0 };
        prodPorTeam[r.team].real += Number(r.produccion_total || 0);
        prodPorTeam[r.team].proj += Number(r.volumen_proyectado || 0);

        // Fecha
        prodPorFecha[r.fecha] ??= { real: 0, proj: 0 };
        prodPorFecha[r.fecha].real += Number(r.produccion_total || 0);
        prodPorFecha[r.fecha].proj += Number(r.volumen_proyectado || 0);

        // Calidad
        prodPorCalidad[r.calidad] ??= { real: 0, proj: 0 };
        prodPorCalidad[r.calidad].real += Number(r.produccion_total || 0);
        prodPorCalidad[r.calidad].proj += Number(r.volumen_proyectado || 0);

        produccionAcum += Number(r.produccion_total || 0);
        proyeccionAcum += Number(r.volumen_proyectado || 0);
      });

      /* 2️⃣ Despachos ------------------------------------------------------- */
      const { data: despRaw } = await supabase
        .from('comparativa_despachos')
        .select('codigo_destino, largo, calidad, volumen_planificado, volumen_despachado');

      const despDest = {};
      const despLargo = {};
      const despCalidad = {};

      let despPlan = 0;
      let despReal = 0;

      despRaw?.forEach(r => {
        // Destino
        despDest[r.codigo_destino] ??= { plan: 0, real: 0 };
        despDest[r.codigo_destino].plan += Number(r.volumen_planificado || 0);
        despDest[r.codigo_destino].real += Number(r.volumen_despachado || 0);

        // Largo
        despLargo[r.largo] ??= { plan: 0, real: 0 };
        despLargo[r.largo].plan += Number(r.volumen_planificado || 0);
        despLargo[r.largo].real += Number(r.volumen_despachado || 0);

        // Calidad
        despCalidad[r.calidad] ??= { plan: 0, real: 0 };
        despCalidad[r.calidad].plan += Number(r.volumen_planificado || 0);
        despCalidad[r.calidad].real += Number(r.volumen_despachado || 0);

        despPlan += Number(r.volumen_planificado || 0);
        despReal += Number(r.volumen_despachado || 0);
      });

      /* 3️⃣ Stock ----------------------------------------------------------- */
      const { data: stockRaw } = await supabase
        .from('vista_dashboard_stock_predios_detallado')
        .select('zona, calidad, volumen_total');

      const stockZona = {};
      const stockCalidad = {};

      let stockAcum = 0;

      stockRaw?.forEach(r => {
        stockZona[r.zona] = (stockZona[r.zona] || 0) + Number(r.volumen_total || 0);
        stockCalidad[r.calidad] = (stockCalidad[r.calidad] || 0) + Number(r.volumen_total || 0);
        stockAcum += Number(r.volumen_total || 0);
      });

      /* ─────────────  guardar métricas globales  ───────────── */
      setMetricas({
        produccionTotal: produccionAcum,
        despachosTotales: despReal,
        stockPredios: stockAcum
      });

      /* ─────────────  construir objetos Plotly  ───────────── */
      const toBar = (obj, label1, label2, name1, name2) => ({
        data: [
          { x: Object.keys(obj), y: Object.values(obj).map(v => v[label1]), type: 'bar', name: name1, marker: { color: verde } },
          { x: Object.keys(obj), y: Object.values(obj).map(v => v[label2]), type: 'bar', name: name2, marker: { color: naranja } }
        ],
        layout: { margin: { t: 40, b: 60 }, legend: { orientation: 'h' } }
      });

      const toLine = obj => ({
        data: [
          { x: Object.keys(obj), y: Object.values(obj).map(v => v.real), type: 'scatter', mode: 'lines+markers', name: 'Real', line: { color: verde } },
          { x: Object.keys(obj), y: Object.values(obj).map(v => v.proj), type: 'scatter', mode: 'lines+markers', name: 'Proyección', line: { color: naranja } }
        ],
        layout: { margin: { t: 40, b: 60 }, legend: { orientation: 'h' } }
      });

      setCharts({
        /* producción */
        team: toBar(prodPorTeam, 'real', 'proj', 'Producción', 'Proyección'),
        fecha: toLine(prodPorFecha),
        calidadProd: toBar(prodPorCalidad, 'real', 'proj', 'Producción', 'Proyección'),
        /* despachos */
        despachoDestino: toBar(despDest, 'real', 'plan', 'Despachado', 'Planificado'),
        despachoLargo: toBar(despLargo, 'real', 'plan', 'Despachado', 'Planificado'),
        despachoCalidad: toBar(despCalidad, 'real', 'plan', 'Despachado', 'Planificado'),
        /* stock */
        stockZona: {
          data: [{ x: Object.keys(stockZona), y: Object.values(stockZona), type: 'bar', marker: { color: naranja } }],
          layout: { margin: { t: 40, b: 60 } }
        },
        stockCalidad: {
          data: [{ x: Object.keys(stockCalidad), y: Object.values(stockCalidad), type: 'bar', marker: { color: verde } }],
          layout: { margin: { t: 40, b: 60 } }
        }
      });
    })();
  }, []);

  /* ──────────────────────────  render  ─────────────────────── */
  const Metric = ({ title, value }) => (
    <div className="bg-[#DFA258] text-black rounded-md p-4 flex flex-col items-center w-full">
      <span className="text-xs font-medium">{title}</span>
      <span className="text-lg font-extrabold tracking-tight">{value.toLocaleString()}</span>
    </div>
  );

  const ChartCard = ({ title, cfg, wide }) => (
    <div className={`bg-white/80 dark:bg-[#1c2e1f]/90 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-3 ${wide ? 'lg:col-span-3' : 'lg:col-span-1'}`}>
      <h4 className="text-center text-sm font-semibold mb-2 text-[#5E564D] dark:text-white">{title}</h4>
      {cfg ? (
        <Plot
          data={cfg.data}
          layout={{ ...cfg.layout, autosize: true, height: 250, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { family: 'inherit', size: 10 } }}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: false }}
        />
      ) : (
        <div className="h-48 flex items-center justify-center text-gray-400">Cargando…</div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[url('/fondo-forestal-pro.jpg')] bg-cover bg-fixed bg-center p-4">
      {/* barra navegación igual al chat */}
      <nav className="flex justify-between items-center bg-white/90 dark:bg-[#1c2e1f]/90 px-4 py-2 rounded shadow mb-4 max-w-6xl mx-auto text-sm font-medium border border-gray-200 dark:border-gray-700">
        <span className="font-semibold flex items-center gap-1 text-[#5E564D] dark:text-white">
          📊 Panel Ejecutivo Forestal
        </span>
        <div className="flex gap-4">
          <a href="/chat" className="hover:underline text-[#5E564D] dark:text-white">🌲 Chat Tronix</a>
          <a href="/dashboards" className="hover:underline text-[#5E564D] dark:text-white">📈 Mis Dashboards</a>
        </div>
      </nav>

      {/* métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-6xl mx-auto mb-4">
        <Metric title="Producción Total (m³)" value={metricas.produccionTotal} />
        <Metric title="Despachos Totales (m³)" value={metricas.despachosTotales} />
        <Metric title="Stock en Predios (m³)" value={metricas.stockPredios} />
      </div>

      {/* grid de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
        <ChartCard title="Comparativa Producción vs Proyección – por Team" cfg={charts.team} wide />
        <ChartCard title="Comparativa Producción vs Proyección – por Fecha" cfg={charts.fecha} />
        <ChartCard title="Producción vs Proyección – por Calidad" cfg={charts.calidadProd} />
        <ChartCard title="Despachos por Destino" cfg={charts.despachoDestino} />
        <ChartCard title="Despachos por Largo" cfg={charts.despachoLargo} />
        <ChartCard title="Despachos por Calidad" cfg={charts.despachoCalidad} />
        <ChartCard title="Stock por Zona" cfg={charts.stockZona} />
        <ChartCard title="Stock por Calidad" cfg={charts.stockCalidad} />
      </div>
    </div>
  );
}
