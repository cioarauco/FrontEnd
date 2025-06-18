import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/App';
import Plot from 'react-plotly.js';
import { FaChartBar } from 'react-icons/fa';

/*  🎨  Colores corporativos  */
const verde = '#00563F';       // Arauco institutional green
const naranja = '#DFA258';     // Arauco warm accent
const rosa   = '#EF476F';
const violeta = '#9b5de5';

export default function PanelEjecutivo() {
  /* ────────────────────────────────  state  ─────────────────────────────── */
  const [raw, setRaw] = useState({
    prod: [],               // comparativa_produccion_teams
    desp: [],               // comparativa_despachos
    stock: []               // vista_dashboard_stock_predios_detallado
  });
  const [loading, setLoading] = useState(true);

  /*  Filtros globales  */
  const [zonaSel, setZonaSel] = useState('Todas las Zonas');
  const [calidadSel, setCalidadSel] = useState('Todas las Calidades');

  /* ────────────────────────────────  fetch  ─────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        /* mismos selects que en app(16).py */
        const { data: prod } = await supabase
          .from('comparativa_produccion_teams')
          .select('team, fecha, zona, calidad, produccion_total, volumen_proyectado');

        const { data: desp } = await supabase
          .from('comparativa_despachos')
          .select('codigo_destino, largo, calidad, zona, volumen_planificado, volumen_despachado');

        const { data: stock } = await supabase
          .from('vista_dashboard_stock_predios_detallado')
          .select('zona, calidad, volumen_total');

        setRaw({ prod: prod || [], desp: desp || [], stock: stock || [] });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ───────────────────────────  helpers  ─────────────────────────── */
  const number = n => n.toLocaleString('es-CL');

  /* ────────────────────────  valores únicos p/ filtros  ─────────────────── */
  const zonas = useMemo(() => ['Todas las Zonas', ...new Set(raw.prod.map(r => r.zona).filter(Boolean))], [raw]);
  const calidades = useMemo(() => ['Todas las Calidades', ...new Set(raw.prod.map(r => r.calidad).filter(Boolean))], [raw]);

  /* ────────────────────────────────  filtros  ───────────────────────────── */
  const prodFil = useMemo(() => raw.prod.filter(r =>
    (zonaSel === 'Todas las Zonas' || r.zona === zonaSel) &&
    (calidadSel === 'Todas las Calidades' || r.calidad === calidadSel)
  ), [raw, zonaSel, calidadSel]);

  const despFil = useMemo(() => raw.desp.filter(r =>
    (zonaSel === 'Todas las Zonas' || r.zona === zonaSel)
  ), [raw, zonaSel]);

  const stockFil = useMemo(() => raw.stock.filter(r =>
    (zonaSel === 'Todas las Zonas' || r.zona === zonaSel)
  ), [raw, zonaSel]);

  /* ─────────────────────  agregaciones & métricas  ───────────────────── */
  const metricas = useMemo(() => {
    const prodTot = prodFil.reduce((a, r) => a + +r.produccion_total, 0);
    const despReal = despFil.reduce((a, r) => a + +r.volumen_despachado, 0);
    const stockTot = stockFil.reduce((a, r) => a + +r.volumen_total, 0);
    return { prodTot, despReal, stockTot };
  }, [prodFil, despFil, stockFil]);

  /* ----------   construye trazas plotly reutilizables   ---------- */
  const barGroup = (obj, label1, label2, name1, name2, color1 = verde, color2 = naranja) => [{
      x: Object.keys(obj),
      y: Object.values(obj).map(v => v[label1]),
      type: 'bar', name: name1, marker: { color: color1 }
    }, {
      x: Object.keys(obj),
      y: Object.values(obj).map(v => v[label2]),
      type: 'bar', name: name2, marker: { color: color2 }
  }];

  /* ----------   Producción vs Proyección  ---------- */
  const teamAgg = useMemo(() => {
    const acc = {};
    prodFil.forEach(r => {
      acc[r.team] ??= { real: 0, proj: 0 };
      acc[r.team].real += +r.produccion_total;
      acc[r.team].proj += +r.volumen_proyectado;
    });
    return acc;
  }, [prodFil]);

  const fechaAgg = useMemo(() => {
    const acc = {};
    prodFil.forEach(r => {
      acc[r.fecha] ??= { real: 0, proj: 0 };
      acc[r.fecha].real += +r.produccion_total;
      acc[r.fecha].proj += +r.volumen_proyectado;
    });
    return acc;
  }, [prodFil]);

  const calidadAggP = useMemo(() => {
    const acc = {};
    prodFil.forEach(r => {
      acc[r.calidad] ??= { real: 0, proj: 0 };
      acc[r.calidad].real += +r.produccion_total;
      acc[r.calidad].proj += +r.volumen_proyectado;
    });
    return acc;
  }, [prodFil]);

  /* ----------   Despachos  ---------- */
  const aggDesp = (key) => {
    const acc = {};
    despFil.forEach(r => {
      const k = r[key] ?? '—';
      acc[k] ??= { real: 0, plan: 0 };
      acc[k].real += +r.volumen_despachado;
      acc[k].plan += +r.volumen_planificado;
    });
    return acc;
  };

  /* ----------   Stock  ---------- */
  const stockAgg = (key) => {
    const acc = {};
    stockFil.forEach(r => {
      const k = r[key] ?? '—';
      acc[k] = (acc[k] || 0) + +r.volumen_total;
    });
    return acc;
  };

  /* ────────────────────────────  componentes  ──────────────────────────── */
  const Metric = ({ title, value }) => (
    <div className="bg-[#d6943c] rounded-md text-center text-black py-4">
      <p className="text-xs font-semibold">{title}</p>
      <p className="text-lg font-extrabold tracking-tight">{number(value)}</p>
    </div>
  );

  const ChartCard = ({ title, traces, layoutExtra = {}, table }) => (
    <div className="bg-white/90 dark:bg-[#1c2e1f]/90 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-3">
      <h4 className="text-center text-sm font-semibold mb-2 text-[#5E564D] dark:text-white">{title}</h4>
      {table ? table : (
        <Plot
          data={traces}
          layout={{ autosize: true, height: 260, margin: { t: 30, l: 40, r: 10, b: 60 }, legend: { orientation: 'h' }, ...layoutExtra, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { size: 10 } }}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
          config={{ displayModeBar: false }}
        />)}
    </div>
  );

  /* ----------   Tabla dinámica para Despachos por Largo  ---------- */
  const tableDespLargo = useMemo(() => {
    const agg = aggDesp('largo');
    const rows = Object.entries(agg).map(([l, v]) => ({ largo: l, real: v.real, plan: v.plan }));
    return (
      <div className="overflow-auto h-60">
        <table className="min-w-full text-xs text-left">
          <thead className="sticky top-0 bg-[#00563F] text-white">
            <tr><th className="px-2 py-1">Largo</th><th className="px-2 py-1">Despachado</th><th className="px-2 py-1">Planificado</th></tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(<tr key={i} className="odd:bg-gray-50"><td className="px-2 py-1">{r.largo}</td><td className="px-2 py-1">{number(r.real)}</td><td className="px-2 py-1">{number(r.plan)}</td></tr>))}
          </tbody>
        </table>
      </div>
    );
  }, [despFil]);

  if (loading) return <p className="text-center mt-10 text-gray-600">Cargando datos…</p>;

  return (
    <div className="min-h-screen bg-[url('/fondo-forestal-pro.jpg')] bg-cover bg-fixed bg-center p-4">
      {/* nav */}
      <nav className="flex justify-between items-center bg-white/90 dark:bg-[#1c2e1f]/90 px-4 py-2 rounded shadow mb-4 max-w-6xl mx-auto text-sm font-medium border border-gray-200 dark:border-gray-700">
        <span className="font-semibold flex items-center gap-1 text-[#5E564D] dark:text-white"><FaChartBar/> Panel Ejecutivo Forestal</span>
        <div className="flex gap-4">
          <a href="/chat" className="hover:underline text-[#5E564D] dark:text-white">🌲 Chat Tronix</a>
          <a href="/dashboards" className="hover:underline text-[#5E564D] dark:text-white">📈 Mis Dashboards</a>
        </div>
      </nav>

      {/* Filtros */}
      <div className="max-w-6xl mx-auto mb-4 flex gap-4 flex-wrap items-center">
        <select value={zonaSel} onChange={e=>setZonaSel(e.target.value)} className="border rounded px-2 py-1 text-sm">
          {zonas.map(z=><option key={z}>{z}</option>)}
        </select>
        <select value={calidadSel} onChange={e=>setCalidadSel(e.target.value)} className="border rounded px-2 py-1 text-sm">
          {calidades.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {/* métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-6xl mx-auto mb-4">
        <Metric title="Producción Total (m³)" value={metricas.prodTot} />
        <Metric title="Despachos Totales (m³)" value={metricas.despReal} />
        <Metric title="Stock en Predios (m³)" value={metricas.stockTot} />
      </div>

      {/* gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto">
        {/* fila 1 */}
        <ChartCard title="Prod. vs Proy. – Team" traces={barGroup(teamAgg,'real','proj','Real','Proyección')} layoutExtra={{barmode:'group', height:300}} />
        <ChartCard title="Prod. vs Proy. – Fecha" traces={[{ x:Object.keys(fechaAgg), y:Object.values(fechaAgg).map(v=>v.real), type:'scatter', mode:'lines+markers', name:'Real', line:{color:verde}}, { x:Object.keys(fechaAgg), y:Object.values(fechaAgg).map(v=>v.proj), type:'scatter', mode:'lines+markers', name:'Proyección', line:{color:naranja}}]} layoutExtra={{height:300}}/>
        {/* fila 2 */}
        <ChartCard title="Prod. vs Proy. – Calidad" traces={barGroup(calidadAggP,'real','proj','Real','Proyección')} />
        <ChartCard title="Despachos – Destino" traces={barGroup(aggDesp('codigo_destino'),'real','plan','Despachado','Planificado',rosa,naranja)} />
        {/* fila 3 */}
        <ChartCard title="Despachos – Largo (tabla)" table={tableDespLargo} />
        <ChartCard title="Stock – Zona" traces={[{ x:Object.keys(stockAgg('zona')), y:Object.values(stockAgg('zona')), type:'bar', marker:{color:rosa} }]} />
        {/* fila 4 */}
        <ChartCard title="Stock – Calidad" traces={[{ x:Object.keys(stockAgg('calidad')), y:Object.values(stockAgg('calidad')), type:'bar', marker:{color:violeta} }]} />
      </div>
    </div>
  );
}
