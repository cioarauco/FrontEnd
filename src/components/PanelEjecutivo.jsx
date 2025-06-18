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

  /* filtros */
  const [zonaSel, setZonaSel] = useState('TODAS');
  const [calidadSel, setCalidadSel] = useState('TODAS');
  const [zonasDisp, setZonasDisp] = useState([]);
  const [calidadesDisp, setCalidadesDisp] = useState([]);

  /* ────────────────────────  fetch + build  ────────────────── */
  useEffect(() => {
    (async () => {
      /* 1️⃣ Producción ------------------------------------------------------ */
      const { data: prodRaw } = await supabase
        .from('comparativa_produccion_teams')
        .select('team, fecha, calidad, produccion_total, volumen_proyectado');

      /* 2️⃣ Despachos ------------------------------------------------------- */
      const { data: despRaw } = await supabase
        .from('comparativa_despachos')
        .select('codigo_destino, largo, calidad, volumen_planificado, volumen_despachado');

      /* 3️⃣ Stock ----------------------------------------------------------- */
      const { data: stockRaw } = await supabase
        .from('vista_dashboard_stock_predios_detallado')
        .select('zona, calidad, volumen_total');

      /* opciones de filtros (solo 1 vez) */
      setZonasDisp(Array.from(new Set(stockRaw?.map(r => r.zona))).sort());
      const cali = new Set([
        ...prodRaw?.map(r => r.calidad) ?? [],
        ...despRaw?.map(r => r.calidad) ?? [],
        ...stockRaw?.map(r => r.calidad) ?? []
      ]);
      setCalidadesDisp(Array.from(cali).sort());

      /* helper filtros */
      const pasaFiltros = r => {
        if (zonaSel !== 'TODAS' && 'zona' in r && r.zona !== zonaSel) return false;
        if (calidadSel !== 'TODAS' && 'calidad' in r && r.calidad !== calidadSel) return false;
        return true;
      };

      const prod = prodRaw?.filter(r => pasaFiltros({ ...r }));
      const desp = despRaw?.filter(r => pasaFiltros({ ...r }));
      const stock = stockRaw?.filter(r => pasaFiltros({ ...r }));

      /* ──────────────  aggregations  ────────────── */
      const prodPorTeam = {}, prodPorFecha = {}, prodPorCalidad = {};
      let produccionAcum = 0, proyeccionAcum = 0;

      prod?.forEach(r => {
        prodPorTeam[r.team] ??= { real: 0, proj: 0 };
        prodPorTeam[r.team].real += +r.produccion_total || 0;
        prodPorTeam[r.team].proj += +r.volumen_proyectado || 0;

        prodPorFecha[r.fecha] ??= { real: 0, proj: 0 };
        prodPorFecha[r.fecha].real += +r.produccion_total || 0;
        prodPorFecha[r.fecha].proj += +r.volumen_proyectado || 0;

        prodPorCalidad[r.calidad] ??= { real: 0, proj: 0 };
        prodPorCalidad[r.calidad].real += +r.produccion_total || 0;
        prodPorCalidad[r.calidad].proj += +r.volumen_proyectado || 0;

        produccionAcum += +r.produccion_total || 0;
        proyeccionAcum += +r.volumen_proyectado || 0;
      });

      const despDest = {}, despLargo = {}, despCalidad = {};
      let despPlan = 0, despReal = 0;

      desp?.forEach(r => {
        despDest[r.codigo_destino] ??= { plan: 0, real: 0 };
        despDest[r.codigo_destino].plan += +r.volumen_planificado || 0;
        despDest[r.codigo_destino].real += +r.volumen_despachado || 0;

        despLargo[r.largo] ??= { plan: 0, real: 0 };
        despLargo[r.largo].plan += +r.volumen_planificado || 0;
        despLargo[r.largo].real += +r.volumen_despachado || 0;

        despCalidad[r.calidad] ??= { plan: 0, real: 0 };
        despCalidad[r.calidad].plan += +r.volumen_planificado || 0;
        despCalidad[r.calidad].real += +r.volumen_despachado || 0;

        despPlan += +r.volumen_planificado || 0;
        despReal += +r.volumen_despachado || 0;
      });

      const stockZona = {}, stockCalidad = {};
      let stockAcum = 0;

      stock?.forEach(r => {
        stockZona[r.zona] = (stockZona[r.zona] || 0) + (+r.volumen_total || 0);
        stockCalidad[r.calidad] = (stockCalidad[r.calidad] || 0) + (+r.volumen_total || 0);
        stockAcum += +r.volumen_total || 0;
      });

      setMetricas({
        produccionTotal: produccionAcum,
        despachosTotales: despReal,
        stockPredios: stockAcum
      });

      /* ─────────────  plot builders  ───────────── */
      const toBar = (obj, l1, l2, n1, n2) => ({
        data: [
          { x: Object.keys(obj), y: Object.values(obj).map(v => v[l1]), type: 'bar', name: n1, marker: { color: verde } },
          { x: Object.keys(obj), y: Object.values(obj).map(v => v[l2]), type: 'bar', name: n2, marker: { color: naranja } }
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
        team: toBar(prodPorTeam, 'real', 'proj', 'Producción', 'Proyección'),
        fecha: toLine(prodPorFecha),
        calidadProd: toBar(prodPorCalidad, 'real', 'proj', 'Producción', 'Proyección'),
        despachoDestino: toBar(despDest, 'real', 'plan', 'Despachado', 'Planificado'),
        despachoLargo: toBar(despLargo, 'real', 'plan', 'Despachado', 'Planificado'),
        despachoCalidad: toBar(despCalidad, 'real', 'plan', 'Despachado', 'Planificado'),
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
  }, [zonaSel, calidadSel]);

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
          layout={{ ...cfg.layout, autosize: true, height: 300, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { family: 'inherit', size: 10 } }}
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
      {/* nav */}
      <nav className="flex justify-between items-center bg-white/90 dark:bg-[#1c2e1f]/90 px-4 py-2 rounded shadow mb-4 max-w-6xl mx-auto text-sm font-medium border border-gray-200 dark:border-gray-700">
        <span className="font-semibold flex items-center gap-1 text-[#5E564D] dark:text-white">
          📊 Panel Ejecutivo Forestal
        </span>
        <div className="flex gap-4">
          <a href="/chat" className="hover:underline text-[#5E564D] dark:text-white">🌲 Chat Tronix</a>
          <a href="/dashboards" className="hover:underline text-[#5E564D] dark:text-white">📈 Mis Dashboards</a>
        </div>
      </nav>

      {/* filtros */}
      <div className="flex flex-wrap gap-4 max-w-6xl mx-auto mb-4">
        <div>
          <label className="block text-xs font-medium text-[#5E564D] dark:text-white mb-1">Zona</label>
          <select value={zonaSel} onChange={e => setZonaSel(e.target.value)} className="bg-white dark:bg-[#1c2e1f] border border-gray-300 dark:border-gray-600 rounded p-1 text-sm">
            <option value="TODAS">Todas</option>
            {zonasDisp.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#5E564D] dark:text-white mb-1">Calidad</label>
          <select value={calidadSel} onChange={e => setCalidadSel(e.target.value)} className="bg-white dark:bg-[#1c2e1f] border border-gray-300 dark:border-gray-600 rounded p-1 text-sm">
            <option value="TODAS">Todas</option>
            {calidadesDisp.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-6xl mx-auto mb-4">
        <Metric title="Producción Total (m³)" value={metricas.produccionTotal} />
        <Metric title="Despachos Totales (m³)" value={metricas.despachosTotales} />
        <Metric title="Stock en Predios (m³)" value={metricas.stockPredios} />
      </div>

      {/* grid gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
        <ChartCard title="Comparativa Producción vs Proyección – por Team" cfg={charts.team} wide />
        <ChartCard title="Comparativa Producción vs Proyección – por Fecha" cfg={charts.fecha} wide />
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
