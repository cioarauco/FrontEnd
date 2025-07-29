import React, { useState, useEffect } from 'react';
import { supabase } from '../App';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { FaTree } from 'react-icons/fa';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const DashboardPage = () => {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshingChart, setRefreshingChart] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [chartRenderKeys, setChartRenderKeys] = useState({});

  // 🎨 NUEVA PALETA DE COLORES MÁS VARIADA Y ATRACTIVA
  const generateColors = (count) => {
    const colors = [
      'rgba(255, 99, 132, 0.8)',    // Rosa vibrante
      'rgba(54, 162, 235, 0.8)',    // Azul cielo
      'rgba(255, 205, 86, 0.8)',    // Amarillo dorado
      'rgba(75, 192, 192, 0.8)',    // Verde agua
      'rgba(153, 102, 255, 0.8)',   // Púrpura
      'rgba(255, 159, 64, 0.8)',    // Naranja
      'rgba(199, 199, 199, 0.8)',   // Gris claro
      'rgba(83, 102, 255, 0.8)',    // Azul índigo
      'rgba(255, 99, 255, 0.8)',    // Magenta
      'rgba(99, 255, 132, 0.8)',    // Verde lima
      'rgba(255, 193, 7, 0.8)',     // Ámbar
      'rgba(156, 39, 176, 0.8)',    // Púrpura profundo
      'rgba(0, 188, 212, 0.8)',     // Cian
      'rgba(76, 175, 80, 0.8)',     // Verde
      'rgba(244, 67, 54, 0.8)',     // Rojo
    ];
    
    const borderColors = [
      'rgba(255, 99, 132, 1)',
      'rgba(54, 162, 235, 1)',
      'rgba(255, 205, 86, 1)',
      'rgba(75, 192, 192, 1)',
      'rgba(153, 102, 255, 1)',
      'rgba(255, 159, 64, 1)',
      'rgba(199, 199, 199, 1)',
      'rgba(83, 102, 255, 1)',
      'rgba(255, 99, 255, 1)',
      'rgba(99, 255, 132, 1)',
      'rgba(255, 193, 7, 1)',
      'rgba(156, 39, 176, 1)',
      'rgba(0, 188, 212, 1)',
      'rgba(76, 175, 80, 1)',
      'rgba(244, 67, 54, 1)',
    ];
    
    return {
      backgrounds: Array.from({ length: count }, (_, i) => colors[i % colors.length]),
      borders: Array.from({ length: count }, (_, i) => borderColors[i % borderColors.length])
    };
  };

  // 🎯 OPCIONES BASE UNIFICADAS PARA TODOS LOS GRÁFICOS
  const getUnifiedBaseOptions = (chartType = 'default') => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart',
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: {
            size: 12,
            weight: '500'
          }
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: function(context) {
            return context[0].label;
          },
          label: function(context) {
            const dataset = context.dataset;
            const value = context.parsed.y || context.parsed;
            
            if (chartType === 'mixed') {
              const serieType = dataset.type || 'line';
              return `${dataset.label} (${serieType}): ${value}`;
            }
            
            return `${dataset.label}: ${value}`;
          }
        }
      }
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 8,
        borderWidth: 2,
        hoverBorderWidth: 3
      },
      line: {
        tension: 0.4,
        borderWidth: 3
      },
      bar: {
        borderWidth: 2,
        borderSkipped: false,
        borderRadius: 4
      }
    },
    scales: chartType !== 'pie' ? {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      }
    } : {}
  });

  // Función para obtener los dashboards del usuario
  const fetchDashboards = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error('Error al obtener usuario: ' + userError.message);
      }

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase
        .from('dashboard')
        .select(`
          id,
          created_at,
          user_id,
          graficos (
             id,
            title,
            chart_type,
            values,
            labels,
            axes,
            sql,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error('Error al obtener dashboards: ' + error.message);
      }

      console.log('Dashboards obtenidos:', data);
      const processedData = data ? data.map(dashboard => ({
        ...dashboard,
        graficos: Array.isArray(dashboard.graficos) 
          ? dashboard.graficos.map(grafico => ({ ...grafico }))
          : dashboard.graficos ? [{ ...dashboard.graficos }] : []
      })) : [];

      setDashboards(processedData);
      } catch (err) {
        console.error('Error en fetchDashboards:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

  // Función mejorada para actualizar gráficos mixtos
  const refreshChart = async (chartId, sql) => {
    try {
      setRefreshingChart(chartId);
      console.log(`🔄 Actualizando gráfico ${chartId} con SQL:`, sql);
      
      const { data, error } = await supabase.rpc('execute_sql', { query: sql });
      
      if (error) {
        throw new Error('Error al ejecutar SQL: ' + error.message);
      }

      console.log('📊 Datos obtenidos del SQL:', data);

      if (!data || data.length === 0) {
        alert('La consulta SQL no devolvió datos. Verifica tu consulta.');
        return;
      }

      const processedData = processChartData(data);
      console.log('🎯 Datos procesados:', processedData);

      const updateData = {
        values: processedData.values,
        labels: processedData.labels,
        updated_at: new Date().toISOString()
      };

      if (processedData.axes) {
        updateData.axes = processedData.axes;
      }

      const { error: updateError } = await supabase
        .from('graficos')
        .update(updateData)
        .eq('id', chartId);

      if (updateError) {
        throw new Error('Error al actualizar gráfico: ' + updateError.message);
      }

      console.log('✅ Gráfico actualizado en BD');

      setChartRenderKeys(prev => ({
        ...prev,
        [chartId]: Date.now()
      }));

      setTimeout(async () => {
        await fetchDashboards();
        alert('¡Gráfico actualizado exitosamente!');
      }, 500);
      
    } catch (err) {
      console.error('❌ Error al actualizar gráfico:', err);
      alert('Error al actualizar gráfico: ' + err.message);
    } finally {
      setRefreshingChart(null);
    }
  };

  // Función mejorada para procesar datos con soporte para gráficos mixtos
  const processChartData = (data) => {
    if (!data || data.length === 0) {
      return { values: [], labels: [] };
    }

    const firstRow = data[0];
    const keys = Object.keys(firstRow);
    
    console.log('Processing chart data:', { data, keys });

    // DETECCIÓN AUTOMÁTICA DE GRÁFICOS MIXTOS
    const hasTypeColumn = keys.some(key => key.toLowerCase().includes('type') || key.toLowerCase().includes('tipo'));
    const hasMultipleNumericColumns = keys.filter(k => 
      typeof data[0][k] === "number" || data.every(row => !isNaN(Number(row[k])))
    ).length > 1;

    if (hasTypeColumn || hasMultipleNumericColumns) {
      console.log('🎯 Posible gráfico mixto detectado');
      
      let labelKey = keys.find(k => k.toLowerCase().includes('fecha') || k.toLowerCase().includes('date')) || keys[0];
      
      if (hasTypeColumn) {
        const typeKey = keys.find(key => key.toLowerCase().includes('type') || key.toLowerCase().includes('tipo'));
        const valueKey = keys.find(k => typeof data[0][k] === "number" || data.every(row => !isNaN(Number(row[k]))));
        const nameKey = keys.find(k => k !== labelKey && k !== typeKey && k !== valueKey);

        if (typeKey && valueKey) {
          const labels = [...new Set(data.map(row => row[labelKey]))].sort();
          const series = [...new Set(data.map(row => row[nameKey || 'serie']))];
          
          const values = series.map(serie => {
            const serieData = data.filter(row => row[nameKey || 'serie'] === serie);
            const serieType = serieData[0]?.[typeKey] || 'line';
            
            return {
              name: serie,
              type: serieType,
              data: labels.map(label => {
                const row = serieData.find(r => r[labelKey] === label);
                return row ? Number(row[valueKey]) : 0;
              }),
              yAxisID: serieType === 'bar' ? 'y1' : 'y'
            };
          });

          const axes = [
            {
              id: 'y',
              position: 'left',
              title: 'Líneas',
              beginAtZero: true
            },
            {
              id: 'y1', 
              position: 'right',
              title: 'Barras',
              beginAtZero: true
            }
          ];

          return {
            labels,
            values,
            axes,
            chart_type: 'mixed'
          };
        }
      }
    }

    // Detecta automáticamente formato apilado y lo pivotea a multi-line (dinámico)
    if (
      data &&
      data.length > 0 &&
      Object.keys(data[0]).length === 3
    ) {
      const keys = Object.keys(data[0]);
    
      const valorKey = keys.find(
        k => typeof data[0][k] === "number" ||
             data.every(row => !isNaN(Number(row[k])))
      );
      if (!valorKey) {
        return null;
      }
    
      let labelKey, serieKey;
      if (keys.includes("fecha")) {
        labelKey = "fecha";
        serieKey = keys.find(k => k !== valorKey && k !== "fecha");
      } else {
        [labelKey, serieKey] = keys.filter(k => k !== valorKey);
      }
    
      const labels = [...new Set(data.map(row => row[labelKey]))].sort();
      const series = [...new Set(data.map(row => row[serieKey]))];
    
      const values = series.map(serie => ({
        label: serie,
        data: labels.map(label => {
          const row = data.find(
            r => r[labelKey] === label && r[serieKey] === serie
          );
          return row ? Number(row[valorKey]) : 0;
        })
      }));
    
      if (values.length > 1) {
        return {
          labels,
          values
        };
      }
    }
    
    // Si hay exactamente 2 columnas, usar una como labels y otra como values
    if (keys.length === 2) {
      return {
        labels: data.map(row => row[keys[0]]),
        values: data.map(row => row[keys[1]])
      };
    }
    
    // Para gráficos multi-line: primera columna como labels, resto como series
    if (keys.length > 2) {
      const labelKey = keys[0];
      const valueKeys = keys.slice(1);
      
      const multiLineData = valueKeys.map(key => ({
        label: key,
        data: data.map(row => row[key])
      }));
      
      console.log('Multi-line data processed:', multiLineData);
      
      return {
        labels: data.map(row => row[labelKey]),
        values: multiLineData
      };
    }
    
    // Fallback para una sola columna
    return {
      labels: data.map((_, index) => `Item ${index + 1}`),
      values: data.map(row => row[keys[0]])
    };
  };

  // Función para limpiar y parsear datos JSON de forma segura
  const safeJsonParse = (jsonString, fallback = null) => {
    if (!jsonString) return fallback;
    
    if (typeof jsonString !== 'string') {
      return jsonString;
    }
    
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error('Error parsing JSON:', e, 'Original string:', jsonString);
      return fallback;
    }
  };

  // 🆕 FUNCIÓN MEJORADA PARA RENDERIZAR GRÁFICOS CON ESTILOS UNIFICADOS
  const renderChart = (grafico) => {
    console.log('🎨 Renderizando gráfico:', {
      id: grafico.id,
      title: grafico.title,
      type: grafico.chart_type,
      values: grafico.values,
      labels: grafico.labels,
      axes: grafico.axes,
      updated_at: grafico.updated_at
    });

    if (!grafico.values || !grafico.labels) {
      return <div className="text-gray-500">No hay datos para mostrar</div>;
    }

    let values = safeJsonParse(grafico.values, []);
    let labels = safeJsonParse(grafico.labels, []);
    let axes = safeJsonParse(grafico.axes, null);

    console.log('📋 Datos parseados:', { values, labels, axes, type: grafico.chart_type });

    if (!values || !labels || (Array.isArray(values) && values.length === 0)) {
      return <div className="text-gray-500">No hay datos válidos para mostrar</div>;
    }

    const forceRenderKey = chartRenderKeys[grafico.id] || 0;
    const chartKey = `chart-${grafico.id}-${forceRenderKey}-${grafico.updated_at}`;
    
    console.log('🔑 Chart key:', chartKey);

    let chartData;

    // Función para crear escalas dinámicas para gráficos mixtos
    const createMixedScales = () => {
      const scales = {
        x: {
          type: 'category',
          labels: labels,
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 11
            }
          }
        }
      };

      if (axes && Array.isArray(axes)) {
        axes.forEach(axis => {
          scales[axis.id] = {
            type: 'linear',
            display: true,
            position: axis.position || 'left',
            title: {
              display: !!axis.title,
              text: axis.title,
              font: {
                size: 12,
                weight: '500'
              }
            },
            grid: {
              drawOnChartArea: axis.position !== 'right',
              color: 'rgba(0, 0, 0, 0.1)',
              drawBorder: false
            },
            beginAtZero: axis.beginAtZero !== false,
            ticks: {
              font: {
                size: 11
              }
            }
          };
        });
      }

      return scales;
    };

    // 🎯 RENDERIZADO SEGÚN TIPO DE GRÁFICO CON ESTILOS UNIFICADOS
    switch (grafico.chart_type) {
      case 'bar':
        const barColors = generateColors(Array.isArray(values) ? values.length : 1);
        chartData = {
          labels: labels,
          datasets: [{
            label: 'Datos',
            data: values,
            backgroundColor: barColors.backgrounds,
            borderColor: barColors.borders,
            borderWidth: 2,
            borderSkipped: false,
            borderRadius: 4,
            hoverBackgroundColor: barColors.borders,
            hoverBorderWidth: 3
          }]
        };
        return (
          <div key={chartKey} style={{ position: 'relative', height: '100%' }}>
            <Bar 
              key={chartKey}
              data={chartData} 
              options={getUnifiedBaseOptions('bar')}
              redraw={true}
            />
          </div>
        );

      case 'pie':
        const pieColors = generateColors(Array.isArray(values) ? values.length : 1);
        chartData = {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: pieColors.backgrounds,
            borderColor: pieColors.borders,
            borderWidth: 3,
            hoverBorderWidth: 4,
            hoverOffset: 8
          }]
        };
        return (
          <div key={chartKey} style={{ position: 'relative', height: '100%' }}>
            <Pie 
              key={chartKey}
              data={chartData} 
              options={getUnifiedBaseOptions('pie')}
              redraw={true}
            />
          </div>
        );

      case 'line':
        const lineColors = generateColors(1);
        chartData = {
          labels: labels,
          datasets: [{
            label: 'Datos',
            data: values,
            fill: false,
            borderColor: lineColors.borders[0],
            backgroundColor: lineColors.backgrounds[0],
            tension: 0.4,
            borderWidth: 3,
            pointBackgroundColor: lineColors.borders[0],
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 8,
            pointHoverBorderWidth: 3
          }]
        };
        return (
          <div key={chartKey} style={{ position: 'relative', height: '100%' }}>
            <Line 
              key={chartKey}
              data={chartData} 
              options={getUnifiedBaseOptions('line')}
              redraw={true}
            />
          </div>
        );

      // CASO PARA GRÁFICOS MIXTOS
      case 'mixed':
        let mixedDatasets = [];
        
        console.log('🎯 Procesando gráfico mixto con values:', values);
        
        if (Array.isArray(values) && values.length > 0) {
          const colors = generateColors(values.length);
          
          mixedDatasets = values.map((serie, index) => {
            const baseDataset = {
              label: serie.name || serie.label || `Serie ${index + 1}`,
              data: Array.isArray(serie.data) ? serie.data : [],
              borderColor: colors.borders[index],
              pointBackgroundColor: colors.borders[index],
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 8,
              pointHoverBorderWidth: 3
            };

            if (serie.type === 'bar') {
              return {
                ...baseDataset,
                type: 'bar',
                backgroundColor: colors.backgrounds[index],
                borderWidth: 2,
                borderSkipped: false,
                borderRadius: 4,
                hoverBackgroundColor: colors.borders[index],
                hoverBorderWidth: 3,
                yAxisID: serie.yAxisID || 'y1',
                order: 2
              };
            } else {
              return {
                ...baseDataset,
                type: 'line',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.4,
                borderWidth: 3,
                yAxisID: serie.yAxisID || 'y',
                order: 1
              };
            }
          });
        }

        console.log('🎨 Mixed datasets generados:', mixedDatasets);

        if (mixedDatasets.length === 0) {
          return (
            <div className="text-red-500">
              <div>No se pudieron procesar los datos del gráfico mixto</div>
              <div className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-auto max-h-32">
                <div>Datos recibidos:</div>
                <pre className="text-xs">{JSON.stringify(values, null, 2)}</pre>
              </div>
            </div>
          );
        }

        chartData = {
          labels: labels,
          datasets: mixedDatasets
        };
        
        return (
          <div key={chartKey} style={{ position: 'relative', height: '100%' }}>
            <Line 
              key={chartKey}
              data={chartData} 
              options={{
                ...getUnifiedBaseOptions('mixed'),
                scales: createMixedScales()
              }}
              redraw={true}
            />
          </div>
        );

      case 'multi-line':
        let datasets = [];
        
        console.log('Procesando multi-line con values:', values);
        
        if (Array.isArray(values) && values.length > 0) {
          if (typeof values[0] === 'object' && values[0] !== null && 'name' in values[0] && 'data' in values[0]) {
            const colors = generateColors(values.length);
            datasets = values.map((series, index) => ({
              label: series.name,
              data: Array.isArray(series.data) ? series.data : [],
              borderColor: colors.borders[index],
              backgroundColor: colors.backgrounds[index],
              fill: false,
              tension: 0.4,
              borderWidth: 3,
              pointBackgroundColor: colors.borders[index],
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 8,
              pointHoverBorderWidth: 3
            }));
          }
          else if (typeof values[0] === 'object' && values[0] !== null && 'label' in values[0] && 'data' in values[0]) {
            const colors = generateColors(values.length);
            datasets = values.map((series, index) => ({
              label: series.label,
              data: Array.isArray(series.data) ? series.data : [],
              borderColor: colors.borders[index],
              backgroundColor: colors.backgrounds[index],
              fill: false,
              tension: 0.4,
              borderWidth: 3,
              pointBackgroundColor: colors.borders[index],
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 8,
              pointHoverBorderWidth: 3
            }));
          } 
          else if (Array.isArray(values[0])) {
            const colors = generateColors(values.length);
            datasets = values.map((series, index) => ({
              label: `Serie ${index + 1}`,
              data: series,
              borderColor: colors.borders[index],
              backgroundColor: colors.backgrounds[index],
              fill: false,
              tension: 0.4,
              borderWidth: 3,
              pointBackgroundColor: colors.borders[index],
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 8,
              pointHoverBorderWidth: 3
            }));
          }
          else if (typeof values[0] === 'number' || typeof values[0] === 'string') {
            const colors = generateColors(1);
            datasets = [{
              label: 'Datos',
              data: values,
              borderColor: colors.borders[0],
              backgroundColor: colors.backgrounds[0],
              fill: false,
              tension: 0.4,
              borderWidth: 3,
              pointBackgroundColor: colors.borders[0],
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 8,
              pointHoverBorderWidth: 3
            }];
          }
        }
        else if (values && typeof values === 'object' && !Array.isArray(values)) {
          const keys = Object.keys(values);
          console.log('Values es objeto con keys:', keys);
          
          if (keys.length > 0) {
            const colors = generateColors(keys.length);
            datasets = keys.map((key, index) => {
              const seriesData = values[key];
              return {
                label: key,
                data: Array.isArray(seriesData) ? seriesData : [seriesData],
                borderColor: colors.borders[index],
                backgroundColor: colors.backgrounds[index],
                fill: false,
                tension: 0.4,
                borderWidth: 3,
                pointBackgroundColor: colors.borders[index],
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 8,
                pointHoverBorderWidth: 3
              };
            });
          }
        }
        else if (typeof values === 'string') {
          try {
            const reparsedValues = JSON.parse(values);
            console.log('Re-parsed values:', reparsedValues);
            
            if (Array.isArray(reparsedValues) && reparsedValues.length > 0) {
              if (typeof reparsedValues[0] === 'object' && reparsedValues[0] !== null && 'name' in reparsedValues[0] && 'data' in reparsedValues[0]) {
                const colors = generateColors(reparsedValues.length);
                datasets = reparsedValues.map((series, index) => ({
                  label: series.name,
                  data: Array.isArray(series.data) ? series.data : [],
                  borderColor: colors.borders[index],
                  backgroundColor: colors.backgrounds[index],
                  fill: false,
                  tension: 0.4,
                  borderWidth: 3,
                  pointBackgroundColor: colors.borders[index],
                  pointBorderColor: '#ffffff',
                  pointBorderWidth: 2,
                  pointRadius: 4,
                  pointHoverRadius: 8,
                  pointHoverBorderWidth: 3
                }));
              }
            }
          } catch (e) {
            console.error('Error re-parsing values:', e);
          }
        }

        console.log('Datasets generados:', datasets);

        if (datasets.length === 0) {
          return (
            <div className="text-red-500">
              <div>No se pudieron procesar los datos del gráfico multi-línea</div>
              <div className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-auto max-h-32">
                <div>Datos recibidos:</div>
                <pre className="text-xs">{JSON.stringify(values, null, 2)}</pre>
              </div>
            </div>
          );
        }

        chartData = {
          labels: labels,
          datasets: datasets
        };
        
        return (
          <div key={chartKey} style={{ position: 'relative', height: '100%' }}>
            <Line 
              key={chartKey}
              data={chartData} 
              options={getUnifiedBaseOptions('multi-line')}
              redraw={true}
            />
          </div>
        );
      
      default:
        return <div className="text-gray-500">Tipo de gráfico no soportado: {grafico.chart_type}</div>;
    }
  };

  // Función para eliminar un dashboard
  const deleteDashboard = async (dashboardId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este gráfico del dashboard?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('dashboard')
        .delete()
        .eq('id', dashboardId);

      if (error) {
        throw new Error('Error al eliminar dashboard: ' + error.message);
      }

      await fetchDashboards();
    } catch (err) {
      console.error('Error al eliminar dashboard:', err);
      alert('Error al eliminar dashboard: ' + err.message);
    }
  };

  // Función para obtener gráficos filtrados por pestaña
  const getFilteredCharts = () => {
    const allCharts = [];
    
    dashboards.forEach((dashboard) => {
      const graficos = Array.isArray(dashboard.graficos) ? dashboard.graficos : [dashboard.graficos];
      graficos.forEach((grafico) => {
        if (grafico) {
          allCharts.push({ dashboard, grafico });
        }
      });
    });

    if (activeTab === 'all') {
      return allCharts;
    }
    
    return allCharts.filter(({ grafico }) => grafico.chart_type === activeTab);
  };

  // Función para obtener tipos únicos incluyendo 'mixed'
  const getUniqueChartTypes = () => {
    const types = new Set();
    dashboards.forEach((dashboard) => {
      const graficos = Array.isArray(dashboard.graficos) ? dashboard.graficos : [dashboard.graficos];
      graficos.forEach((grafico) => {
        if (grafico && grafico.chart_type) {
          types.add(grafico.chart_type);
        }
      });
    });
    return Array.from(types);
  };

  useEffect(() => {
    fetchDashboards();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[url('/camioncito.png')] bg-cover bg-fixed bg-bottom p-6">
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <div className="text-lg text-gray-600">Cargando dashboards...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[url('/camioncito.png')] bg-cover bg-fixed bg-bottom p-6">
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 shadow-lg">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
            <button 
              onClick={fetchDashboards}
              className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (dashboards.length === 0) {
    return (
      <div className="min-h-screen bg-[url('/camioncito.png')] bg-cover bg-fixed bg-bottom p-6">
        {/* HEADER DE NAVEGACIÓN */}
        <div className="flex justify-between items-center bg-white/90 dark:bg-[#1c2e1f]/90 px-6 py-3 rounded-xl shadow mb-6 max-w-4xl mx-auto border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <FaTree className="text-2xl text-[#D2C900]" />
            <span className="text-xl font-serif font-bold text-[#5E564D] dark:text-white">
              Tronix Forest Assistant
            </span>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <a href="/chat" className="text-[#5E564D] dark:text-white hover:underline">
              🌲 Chat Tronix
            </a>
            <a href="/dashboards" className="text-[#D2C900] dark:text-[#D2C900] hover:underline font-bold">
              📊 Mis Dashboards
            </a>
            <a href="/panel-ejecutivo" className="text-[#5E564D] dark:text-white hover:underline">
              📈 Panel Ejecutivo
            </a>
            <a
              href="/"
              onClick={() => supabase.auth.signOut()}
              className="text-[#5E564D] dark:text-red-400 hover:underline"
            >
              🚪 Cerrar sesión
            </a>
          </div>
        </div>

        <div className="flex justify-center items-center h-screen">
          <div className="text-center bg-white/90 dark:bg-[#1c2e1f]/90 rounded-lg shadow-lg p-8 max-w-md mx-auto backdrop-blur-sm">
            <div className="text-6xl mb-4">📊</div>
            <div className="text-gray-600 dark:text-white text-lg mb-2">
              No tienes gráficos guardados en tus dashboards
            </div>
            <div className="text-gray-400">
              Crea gráficos con el agente de IA y guárdalos para verlos aquí
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredCharts = getFilteredCharts();
  const chartTypes = getUniqueChartTypes();

  return (
    <div className="min-h-screen bg-[url('/camioncito.png')] bg-cover bg-fixed bg-bottom p-6">
      {/* HEADER DE NAVEGACIÓN */}
      <div className="flex justify-between items-center bg-white/90 dark:bg-[#1c2e1f]/90 px-6 py-3 rounded-xl shadow mb-6 max-w-6xl mx-auto border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <FaTree className="text-2xl text-[#D2C900]" />
          <span className="text-xl font-serif font-bold text-[#5E564D] dark:text-white">
            Tronix Forest Assistant
          </span>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <a href="/chat" className="text-[#5E564D] dark:text-white hover:underline">
            🌲 Chat Tronix
          </a>
          <a href="/dashboards" className="text-[#D2C900] dark:text-[#D2C900] hover:underline font-bold">
            📊 Mis Dashboards
          </a>
          <a href="/panel-ejecutivo" className="text-[#5E564D] dark:text-white hover:underline">
            📈 Panel Ejecutivo
          </a>
          <a
            href="/"
            onClick={() => supabase.auth.signOut()}
            className="text-[#5E564D] dark:text-red-400 hover:underline"
          >
            🚪 Cerrar sesión
          </a>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="bg-white/90 dark:bg-[#1c2e1f]/90 rounded-xl shadow-lg max-w-6xl mx-auto border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">📊 Mis Dashboards</h1>
            <p className="text-gray-600 dark:text-gray-300">Visualiza y gestiona tus gráficos de datos con estilos mejorados</p>
          </div>
          <button 
            onClick={fetchDashboards}
            className="px-6 py-3 bg-gradient-to-r from-[#D2C900] to-[#bcae00] text-black rounded-lg hover:from-[#bcae00] hover:to-[#a89800] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            🔄 Refrescar
          </button>
        </div>

        {/* Pestañas de navegación mejoradas */}
        <div className="p-6 pb-0">
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-inner p-1 inline-flex space-x-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 transform ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-[#D2C900] to-[#bcae00] text-black shadow-lg scale-105'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-600/50'
              }`}
            >
              📈 Todos ({filteredCharts.length})
            </button>
            
            {chartTypes.map((type) => {
              const count = getFilteredCharts().filter(({ grafico }) => grafico.chart_type === type).length;
              const icon = {
                'bar': '📊',
                'pie': '🥧',
                'line': '📈',
                'multi-line': '📊',
                'mixed': '🎯'
              }[type] || '📊';
              
              const label = {
                'bar': 'Barras',
                'pie': 'Circular',
                'line': 'Líneas',
                'multi-line': 'Multi-Líneas',
                'mixed': 'Mixtos'
              }[type] || type;

              return (
                <button
                  key={type}
                  onClick={() => setActiveTab(type)}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 transform ${
                    activeTab === type
                      ? 'bg-gradient-to-r from-[#D2C900] to-[#bcae00] text-black shadow-lg scale-105'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-600/50'
                  }`}
                >
                  {icon} {label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid de gráficos */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCharts.map(({ dashboard, grafico }) => (
              <div 
                key={`${dashboard.id}-${grafico.id}`} 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 hover:scale-105 overflow-hidden border border-gray-100 dark:border-gray-700"
              >
                {/* Header de la tarjeta con gradiente */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 leading-tight">
                        {grafico.title || 'Sin título'}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center bg-white dark:bg-gray-700 px-3 py-1 rounded-full shadow-sm">
                          {grafico.chart_type === 'bar' && '📊'}
                          {grafico.chart_type === 'pie' && '🥧'}
                          {grafico.chart_type === 'line' && '📈'}
                          {grafico.chart_type === 'multi-line' && '📊'}
                          {grafico.chart_type === 'mixed' && '🎯'}
                          <span className="ml-1 capitalize font-medium">
                            {grafico.chart_type === 'mixed' ? 'Mixto' : grafico.chart_type}
                          </span>
                        </span>
                        <span className="flex items-center">
                          📅 {new Date(grafico.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {/* Información de ejes para gráficos mixtos */}
                      {grafico.chart_type === 'mixed' && grafico.axes && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                            Ejes: {safeJsonParse(grafico.axes, []).map(axis => axis.title).join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => refreshChart(grafico.id, grafico.sql)}
                        disabled={refreshingChart === grafico.id}
                        className="px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-110"
                        title="Actualizar datos"
                      >
                        {refreshingChart === grafico.id ? '⏳' : '🔄'}
                      </button>
                      <button
                        onClick={() => deleteDashboard(dashboard.id)}
                        className="px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-110"
                        title="Eliminar gráfico"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>

                {/* Contenido del gráfico */}
                <div className="p-6">
                  <div className="h-64 relative bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-lg">
                    {renderChart(grafico)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mensaje cuando no hay gráficos en la pestaña activa */}
          {filteredCharts.length === 0 && activeTab !== 'all' && (
            <div className="text-center py-16">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md mx-auto border">
                <div className="text-6xl mb-4">🔍</div>
                <div className="text-gray-600 dark:text-gray-300 text-lg mb-2">
                  No hay gráficos de tipo "{activeTab}"
                </div>
                <div className="text-gray-400">
                  Crea más gráficos o cambia a otra pestaña
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
