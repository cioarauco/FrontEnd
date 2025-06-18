import React, { useEffect, useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { supabase } from '@/App';
import { FaChartBar } from 'react-icons/fa';

/* 🎨 Paleta corporativa */
const verde   = '#00563F';  // real / despachado / stock principal
const gris    = '#7E7E7E';  // planificado / proyección
const naranja = '#DFA258';  // métricas
const rosa    = '#EF476F';  // stock zona
const violeta = '#9B5DE5';  // stock calidad

export default function PanelEjecutivo() {
  /* ────────────────────────────────  estado  ───────────────────────────── */
  const [raw, setRaw]                 = useState({ prod: [], desp: [], stock: [] });
  const [loading, setLoading]         = useState(true);
  const [zonaSel, setZonaSel]         = useState('Todas las Zonas');
  const [calidadSel, setCalidadSel]   = useState('Todas las Calidades');

  /* ─────────────────────────────── fetch  ─────────────────────────────── */
  useEffect(() => {
    (async () => {
      const { data: prod }  = await supabase.from('comparativa_produccion_teams').select('team, fecha, zona, calidad, produccion_total, volumen_proyectado');
      const { data: desp }  = await supabase.from('comparativa_despachos').select('codigo_destino, largo, calidad, zona, volumen_planificado, volumen_despachado');
      const { data: stock } = await supabase.from('vista_dashboard_stock_predios_detallado').select('zona, calidad, volumen_total');

      setRaw({ prod: prod || [], desp: desp || [], stock: stock || [] });
      setLoading(false);
    })();
  }, []);

  /* ───────────────────────────── valores filtro  ───────────────────────── */
  const zonas     = useMemo(() => ['Todas las Zonas', ...new Set(raw.prod.map(r => r.zona).filter(Boolean))], [raw]);
  const calidades = useMemo(() => ['Todas las Calidades', ...new Set(raw.prod.map(r => r.calidad).filter(Boolean))], [raw]);

  /* ─────────────────────────── aplicar filtros ─────────────────────────── */
  const prodFil = useMemo(() => raw.prod.filter(r =>
    (zonaSel    === 'Todas las Zonas'      || r.zona    === zonaSel) &&
    (calidadSel === 'Todas las Calidades' || r.calidad === calidadSel)
  ), [raw, zonaSel, calidadSel]);

  const despFil = useMemo(() => raw.desp.filter(r =>
    (zonaSel === 'Todas las Zonas' || r.zona === zonaSel)
  ), [raw, zonaSel]);

  const stockFil = useMemo(() => raw.stock.filter(r =>
    (zonaSel === 'Todas las Zonas' || r.zona === zonaSel)
  ), [raw, zonaSel]);

  /* ───────────────────────────── métricas ──────────────────────────────── */
  const metricas = useMemo(() => ({
    prodTot : prodFil.reduce((a,r) => a + +r.produccion_total, 0),
    despReal: despFil.reduce((a,r) => a + +r.volumen_despachado, 0),
    stockTot: stockFil.reduce((a,r) => a + +r.volumen_total, 0)
  }), [prodFil, despFil, stockFil]);

  /* ────────────────────────  helpers gráficos  ─────────────────────────── */
  const barGroup = (obj, l1, l2, n1, n2, c1 = verde, c2 = gris) => ([
    { x: Object.keys(obj), y: Object.values(obj).map(v => v[l1]), type: 'bar', name: n1, marker: { color: c1 } },
    { x: Object.keys(obj), y: Object.values(obj).map(v => v[l2]), type: 'bar', name: n2, marker: { color: c2 } }
  ]);

  /* ─────────────────── agregaciones según filtro ───────────────────────── */
  const aggProd = useMemo(() => {
    const by = (key) => {
      const a = {};
      prodFil.forEach(r => {
        const k = (r[key] || '—').toString().trim();
        a[k] ??= { real: 0, proj: 0 };
        a[k].real += +r.produccion_total;
        a[k].proj += +r.volumen_proyectado;
      });
      return a;
    };
    return {
      team:    by('team'),
      fecha:   by('fecha'),
      calidad: by('calidad')
    };
  }, [prodFil]);

  const aggDesp = useMemo(() => {
    const by = (key) => {
      const a = {};
      despFil.forEach(r => {
        const k = (r[key] || '—').toString().trim();
        a[k] ??= { real: 0, plan: 0 };
        a[k].real += +r.volumen_despachado;
        a[k].plan += +r.volumen_planificado;
      });
      return a;
    };
    return {
      destino: by('codigo_destino'),
      largo:   by('largo'),
      calidad: by('calidad')
    };
  }, [despFil]);

  const aggStock = useMemo(() => {
    const zona = {}; const cal = {};
    stockFil.forEach(r => {
      zona[r.zona]     = (zona[r.zona]     || 0) + +r.volumen_total;
      cal[r.calidad]   = (cal[r.calidad]   || 0) + +r.volumen_total;
    });
    return { zona, cal };
  }, [stockFil]);

  /* ──────────────────────────── UI helpers ─────────────────────────────── */
  const Metric = ({ title, value }) => (
    <div className="bg-[#d6943c] rounded-md text-center py-3 text-black">
      <p className="text-xs font-semibold">{title}</p>
      <p className="text-lg font-extrabold tracking-tight">{value.toLocaleString('es-CL')}</p>
    </div>
  );

  const ChartCard = ({ title, traces, layoutExtra = {} }) => (
    <div className="bg-white/90 dark:bg-[#1c2e1f]/90 border border-gray-200 dark:border-gray-700 rounded-xl shadow p-3">
      <h4 className="text-center text-sm font-semibold mb-2 text-[#5E564D] dark:text-white">{title}</h4>
      <Plot
        data={traces}
        layout={{ autosize: true, height: 260, margin: { t: 30, l: 40, r: 10, b: 60 }, legend: { orientation: 'h', y: -0.3 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { size: 10 }, ...layoutExtra }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
        config={{ displayModeBar: false }}
      />
    </div>
  );

  if (loading) return <p className="text-center mt-10 text-gray-600">Cargando datos…</p>;

  return (
    <div className="min-h-screen bg-[url('/fondo-forestal-pro.jpg')] bg-cover bg-fixed bg-center p-4">
      {/* nav */}
      <nav className="flex justify-between items-center bg-white/90 dark:bg-[#1c2e1f]/90 px-4 py-2 rounded shadow mb-4 max-w-6xl mx-auto text-sm font-medium border border-gray-200 dark:border-gray-700">
        <span className="font-semibold flex items-center gap-1 text-[#5E564D] dark:text-white"><FaChartBar/> Panel Ejecutivo Forestal</span>
        <div className="flex gap-4">
          <a href="/chat"       className="hover:underline text-[#5E564D] dark:text-white">🌲 Chat Tronix</a>
          <a href="/dashboards" className="hover:underline text-[#5E564D] dark:text-white">📈 Mis Dashboards</a>
        </div>
      </nav>

      {/* filtros */}
      <div className="max-w-6xl mx-auto mb-4 flex gap-4 flex-wrap items-center">
        <select value={zonaSel} onChange={e => setZonaSel(e.target.value)} className="border rounded px-2 py-1 text-sm">
          {zonas.map(z => <option key={z}>{z}</option>)}
        </select>
        <select value={calidadSel} onChange={e => setCalidadSel(e.target.value)} className="border rounded px-2 py-1 text-sm">
          {calidades.map(c => <option key={c}>{c}</option>)}
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
        {/* Producción */}
        <ChartCard title="Prod. vs Proy. – Team"    traces={barGroup(aggProd.team,    'real', 'proj', 'Real', 'Proyección')} layoutExtra={{ barmode: 'group' }} />
        <ChartCard title="Prod. vs Proy. – Fecha"   traces={[
          { x: Object.keys(aggProd.fecha),   y: Object.values(aggProd.fecha).map(v => v.real), type: 'scatter', mode: 'lines+markers', name: 'Real',       line: { color: verde } },
          { x: Object.keys(aggProd.fecha),   y: Object.values(aggProd.fecha).map(v => v.proj), type: 'scatter', mode: 'lines+markers', name: 'Proyección', line: { color: gris  } }
        ]} />
        <ChartCard title="Prod. vs Proy. – Calidad" traces={barGroup(aggProd.calidad, 'real', 'proj', 'Real', 'Proyección')} />

        {/* Despachos */}
        <ChartCard title="Despachos – Destino" traces={barGroup(aggDesp.destino, 'real', 'plan', 'Despachado', 'Planificado')} />
        <ChartCard title="Despachos – Largo"   traces={barGroup(aggDesp.largo,   'real', 'plan', 'Despachado', 'Planificado')} />
        <ChartCard title="Despachos – Calidad" traces={barGroup(aggDesp.calidad, 'real', 'plan', 'Despachado', 'Planificado')} />

        {/* Stock */}
        <ChartCard title="Stock – Zona"    traces={[{ x: Object.keys(aggStock.zona),    y: Object.values(aggStock.zona),    type: 'bar', marker: { color: rosa } }]} />
        <ChartCard title="Stock – Calidad" traces={[{ x: Object.keys(aggStock.cal),     y: Object.values(aggStock.cal),     type: 'bar', marker: { color: violeta } }]} />
      </div>
    </div>
  );
}
