// src/components/PanelEjecutivo.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../App';
import Plot from 'react-plotly.js';

/* 🎨 Colores corporativos */
const verde   = '#00563F';
const naranja = '#DFA258';

/* ────────────────────────────────────────────────────────────── */
export default function PanelEjecutivo() {
  /* 1️⃣  Estados ---------------------------------------------------------- */
  const [raw, setRaw] = useState({ prod: [], desp: [], stock: [] });
  const [loading, setLoading] = useState(true);

  /* filtros globales */
  const [zonaSel, setZonaSel]       = useState('Todas las Zonas');
  const [calidadSel, setCalidadSel] = useState('Todas las Calidades');

  /* 2️⃣  Fetch único de datos -------------------------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const { data: prod } = await supabase
          .from('comparativa_produccion_teams')
          .select('team, fecha, zona, calidad, produccion_total, volumen_proyectado');

        const { data: desp } = await supabase
          .from('comparativa_despachos')
          .select('codigo_destino, largo, zona, calidad, volumen_planificado, volumen_despachado');

        const { data: stock } = await supabase
          .from('vista_dashboard_stock_predios_detallado')
          .select('zona, calidad, volumen_total');

        setRaw({ prod: prod || [], desp: desp || [], stock: stock || [] });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* 3️⃣  Valores únicos para los select ---------------------------------- */
  const zonasDisp = useMemo(() => {
    const all = new Set([
      ...raw.prod.map(r => r.zona),
      ...raw.desp.map(r => r.zona),
      ...raw.stock.map(r => r.zona)
    ].filter(Boolean));
    return ['Todas las Zonas', ...Array.from(all).sort()];
  }, [raw]);

  const calidadesDisp = useMemo(() => {
    const all = new Set([
      ...raw.prod.map(r => r.calidad),
      ...raw.desp.map(r => r.calidad),
      ...raw.stock.map(r => r.calidad)
    ].filter(Boolean));
    return ['Todas las Calidades', ...Array.from(all).sort()];
  }, [raw]);

  /* 4️⃣  Aplicar filtros (useMemo) --------------------------------------- */
  const pasaFiltros = r =>
    (zonaSel   === 'Todas las Zonas'    || r.zona    === zonaSel) &&
    (calidadSel=== 'Todas las Calidades'|| r.calidad === calidadSel);

  const prodFil  = useMemo(() => raw.prod .filter(pasaFiltros), [raw, zonaSel, calidadSel]);
  const despFil  = useMemo(() => raw.desp .filter(pasaFiltros), [raw, zonaSel, calidadSel]);
  const stockFil = useMemo(() => raw.stock.filter(pasaFiltros), [raw, zonaSel, calidadSel]);

  /* 5️⃣  Métricas --------------------------------------------------------- */
  const metricas = useMemo(() => ({
    prodTot : prodFil .reduce((a,r)=>a+ +r.produccion_total ,0),
    despTot : despFil .reduce((a,r)=>a+ +r.volumen_despachado,0),
    stockTot: stockFil.reduce((a,r)=>a+ +r.volumen_total    ,0)
  }), [prodFil, despFil, stockFil]);

  /* 6️⃣  Helpers de agregación ------------------------------------------- */
  const aggProd = (key) => {
    const acc={};
    prodFil.forEach(r=>{
      const k=r[key]??'—';
      acc[k]??={real:0,proj:0};
      acc[k].real+=+r.produccion_total;
      acc[k].proj+=+r.volumen_proyectado;
    });
    return acc;
  };

  const aggDesp = (key) => {
    const acc={};
    despFil.forEach(r=>{
      const k=r[key]??'—';
      acc[k]??={real:0,plan:0};
      acc[k].real+=+r.volumen_despachado;
      acc[k].plan+=+r.volumen_planificado;
    });
    return acc;
  };

  const aggStock = (key) => {
    const acc={};
    stockFil.forEach(r=>{
      const k=r[key]??'—';
      acc[k]=(acc[k]||0)+ +r.volumen_total;
    });
    return acc;
  };

  /* 7️⃣  Build trazas Plotly --------------------------------------------- */
  const toBar = (obj,l1,l2,n1,n2) => ([
    { x:Object.keys(obj), y:Object.values(obj).map(v=>v[l1]), type:'bar', name:n1, marker:{color:verde}   },
    { x:Object.keys(obj), y:Object.values(obj).map(v=>v[l2]), type:'bar', name:n2, marker:{color:naranja}}
  ]);

  const toLine = (obj) => ([
    { x:Object.keys(obj), y:Object.values(obj).map(v=>v.real), type:'scatter', mode:'lines+markers', name:'Real'      , line:{color:verde}   },
    { x:Object.keys(obj), y:Object.values(obj).map(v=>v.proj), type:'scatter', mode:'lines+markers', name:'Proyección', line:{color:naranja}}
  ]);

  const charts = {
    /* producción */
    team       : { traces: toBar (aggProd('team')  ,'real','proj','Real','Proyección'), extra:{barmode:'group'} },
    fecha      : { traces: toLine(aggProd('fecha')),                                    extra:{}                },
    calidadProd: { traces: toBar (aggProd('calidad'),'real','proj','Real','Proyección'), extra:{barmode:'group'} },
    /* despachos */
    despDest   : { traces: toBar (aggDesp('codigo_destino'),'real','plan','Despachado','Planificado'),            extra:{barmode:'group'} },
    despLargo  : { traces: toBar (aggDesp('largo')         ,'real','plan','Despachado','Planificado'),            extra:{barmode:'group'} },
    despCalidad: { traces: toBar (aggDesp('calidad')       ,'real','plan','Despachado','Planificado'),            extra:{barmode:'group'} },
    /* stock */
    stockZona  : { traces: [{ x:Object.keys(aggStock('zona')),    y:Object.values(aggStock('zona')),    type:'bar', marker:{color:naranja} }], extra:{} },
    stockCalid : { traces: [{ x:Object.keys(aggStock('calidad')), y:Object.values(aggStock('calidad')), type:'bar', marker:{color:verde  } }], extra:{} }
  };

  /* 8️⃣  Pequeños componentes -------------------------------------------- */
  const numberCL = n => n.toLocaleString('es-CL');

  const Metric = ({ title, value }) => (
    <div className="bg-[#DFA258] text-black rounded-md p-4 flex flex-col items-center w-full">
      <span className="text-xs font-medium">{title}</span>
      <span className="text-lg font-extrabold tracking-tight">{numberCL(value)}</span>
    </div>
  );

  const ChartCard = ({ title, cfg, wide=false }) => (
    <div className={`bg-white/80 dark:bg-[#1c2e1f]/90 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-3 ${wide?'lg:col-span-3':'lg:col-span-1'}`}>
      <h4 className="text-center text-sm font-semibold mb-2 text-[#5E564D] dark:text-white">{title}</h4>
      <Plot
        data={cfg.traces}
        layout={{
          autosize:true,
          height:300,
          margin:{t:40,l:40,r:10,b:60},
          legend:{orientation:'h'},
          ...cfg.extra,
          paper_bgcolor:'rgba(0,0,0,0)',
          plot_bgcolor:'rgba(0,0,0,0)',
          font:{size:10}
        }}
        useResizeHandler
        style={{width:'100%',height:'100%'}}
        config={{displayModeBar:false}}
      />
    </div>
  );

  /* 9️⃣  UI --------------------------------------------------------------- */
  if (loading) return <p className="text-center mt-10 text-gray-600">Cargando datos…</p>;

  return (
    <div className="min-h-screen bg-[url('/fondo-forestal-pro.jpg')] bg-cover bg-fixed bg-center p-4">
      {/* nav */}
      <nav className="flex justify-between items-center bg-white/90 dark:bg-[#1c2e1f]/90 px-4 py-2 rounded shadow mb-4 max-w-6xl mx-auto text-sm font-medium border border-gray-200 dark:border-gray-700">
        <span className="font-semibold flex items-center gap-1 text-[#5E564D] dark:text-white">
          📊 Panel Ejecutivo Forestal
        </span>
        <div className="flex gap-4">
          <a href="/chat"       className="hover:underline text-[#5E564D] dark:text-white">🌲 Chat Tronix</a>
          <a href="/dashboards" className="hover:underline text-[#5E564D] dark:text-white">📈 Mis Dashboards</a>
        </div>
      </nav>

      {/* filtros */}
      <div className="max-w-6xl mx-auto mb-4 flex gap-4 flex-wrap items-center">
        <select value={zonaSel} onChange={e=>setZonaSel(e.target.value)} className="border rounded px-2 py-1 text-sm">
          {zonasDisp.map(z=><option key={z}>{z}</option>)}
        </select>
        <select value={calidadSel} onChange={e=>setCalidadSel(e.target.value)} className="border rounded px-2 py-1 text-sm">
          {calidadesDisp.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {/* métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-6xl mx-auto mb-4">
        <Metric title="Producción Total (m³)" value={metricas.prodTot} />
        <Metric title="Despachos Totales (m³)" value={metricas.despTot} />
        <Metric title="Stock en Predios (m³)" value={metricas.stockTot} />
      </div>

      {/* gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
        {/* fila 1 (a lo largo) */}
        <ChartCard title="Prod. vs Proy. – Team"   cfg={charts.team}  wide />
        <ChartCard title="Prod. vs Proy. – Fecha"  cfg={charts.fecha} wide />
        {/* fila 2 */}
        <ChartCard title="Prod. vs Proy. – Calidad" cfg={charts.calidadProd}/>
        <ChartCard title="Despachos – Destino"      cfg={charts.despDest}/>
        <ChartCard title="Despachos – Largo"        cfg={charts.despLargo}/>
        {/* fila 3 */}
        <ChartCard title="Despachos – Calidad"      cfg={charts.despCalidad}/>
        <ChartCard title="Stock – Zona"             cfg={charts.stockZona}/>
        <ChartCard title="Stock – Calidad"          cfg={charts.stockCalid}/>
      </div>
    </div>
  );
}
