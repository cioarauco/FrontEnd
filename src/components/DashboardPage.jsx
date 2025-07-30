import React, { useState, useEffect } from 'react';
import { supabase } from '../App';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { FaTree, FaArrowLeft, FaPlus, FaFolder, FaChartBar, FaExpand, FaCompress, FaExpandArrowsAlt } from 'react-icons/fa';

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
  // Estados principales
  const [categories, setCategories] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshingChart, setRefreshingChart] = useState(null);
  const [chartRenderKeys, setChartRenderKeys] = useState({});
  const [showCreateCategory, setShowCreateCategory] = useState(false);

  // Estados para el layout flexible
  const [chartSizes, setChartSizes] = useState({});
  const [editMode, setEditMode] = useState(false);

  // Estados para crear categoría
  const [newCategory, setNewCategory] = useState({
    name: '',
    icon: '📊',
    description: '',
    color: '#3B82F6'
  });

  // Paleta de colores unificada
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
    
    const borderColors = colors.map(color => color.replace('0.8', '1'));
    
    return {
      backgrounds: Array.from({ length: count }, (_, i) => colors[i % colors.length]),
      borders: Array.from({ length: count }, (_, i) => borderColors[i % borderColors.length])
    };
  };

  // Opciones base unificadas para gráficos
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

  // Función para obtener las clases de tamaño según el tipo
  const getChartSizeClasses = (chartId, size) => {
    const currentSize = size || chartSizes[chartId] || 'medium';
    
    switch (currentSize) {
      case 'small':
        return 'col-span-12 md:col-span-6 lg:col-span-4';
      case 'medium':
        return 'col-span-12 md:col-span-6';
      case 'large':
        return 'col-span-12';
      default:
        return 'col-span-12 md:col-span-6';
    }
  };

  // Función para obtener la altura según el tamaño
  const getChartHeight = (chartId, size) => {
    const currentSize = size || chartSizes[chartId] || 'medium';
    
    switch (currentSize) {
      case 'small':
        return 'h-64';
      case 'medium':
        return 'h-80';
      case 'large':
        return 'h-96';
      default:
        return 'h-80';
    }
  };

  // Función para cambiar el tamaño de un gráfico
  const changeChartSize = (chartId, newSize) => {
    setChartSizes(prev => ({
      ...prev,
      [chartId]: newSize
    }));
    
    // Forzar re-render del gráfico
    setChartRenderKeys(prev => ({
      ...prev,
      [chartId]: Date.now()
    }));
  };

  // Componente de selector de tamaño
  const SizeSelector = ({ chartId, currentSize }) => {
    if (!editMode) return null;
    
    const size = currentSize || chartSizes[chartId] || 'medium';
    
    return (
      <div className="absolute top-2 right-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-1 flex gap-1 z-10">
        <button
          onClick={() => changeChartSize(chartId, 'small')}
          className={`p-2 rounded ${size === 'small' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          title="Pequeño (1/3)"
        >
          <FaCompress className="text-xs" />
        </button>
        <button
          onClick={() => changeChartSize(chartId, 'medium')}
          className={`p-2 rounded ${size === 'medium' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          title="Mediano (1/2)"
        >
          <FaExpandArrowsAlt className="text-xs" />
        </button>
        <button
          onClick={() => changeChartSize(chartId, 'large')}
          className={`p-2 rounded ${size === 'large' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          title="Grande (completo)"
        >
          <FaExpand className="text-xs" />
        </button>
      </div>
    );
  };

  // Función para obtener categorías con contadores
  const fetchCategories = async () => {
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

      const { data, error } = await supabase.rpc('get_dashboard_categories_with_count', {
        user_uuid: user.id
      });

      if (error) {
        throw new Error('Error al obtener categorías: ' + error.message);
      }

      console.log('Categorías obtenidas:', data);
      setCategories(data || []);
      
    } catch (err) {
      console.error('Error en fetchCategories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener dashboards de una categoría específica
  const fetchDashboardsByCategory = async (categoryId) => {
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

      const { data, error } = await supabase.rpc('get_dashboards_by_category', {
        user_uuid: user.id,
        category_uuid: categoryId
      });

      if (error) {
        throw new Error('Error al obtener dashboards: ' + error.message);
      }

      console.log('Dashboards de categoría obtenidos:', data);
      
      const processedData = data ? data.map(dashboard => ({
        ...dashboard,
        graficos: Array.isArray(dashboard.graficos) && dashboard.graficos[0] !== null 
          ? dashboard.graficos 
          : []
      })) : [];

      setDashboards(processedData);
      
    } catch (err) {
      console.error('Error en fetchDashboardsByCategory:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para crear nueva categoría
  const createCategory = async () => {
    try {
      if (!newCategory.name.trim()) {
        alert('Por favor ingresa un nombre para la categoría');
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase.rpc('create_dashboard_category', {
        user_uuid: user.id,
        category_name: newCategory.name,
        category_icon: newCategory.icon,
        category_description: newCategory.description,
        category_color: newCategory.color
      });

      if (error) {
        throw new Error('Error al crear categoría: ' + error.message);
      }

      console.log('Categoría creada:', data);
      
      setNewCategory({
        name: '',
        icon: '📊',
        description: '',
        color: '#3B82F6'
      });
      setShowCreateCategory(false);
      await fetchCategories();
      
    } catch (err) {
      console.error('Error al crear categoría:', err);
      alert('Error al crear categoría: ' + err.message);
    }
  };

  // 🆕 FUNCIÓN ESPECIALIZADA PARA PROCESAR GRÁFICOS MIXTOS
  const processChartDataPreservingMixed = (data, originalChartType, originalAxes) => {
    if (!data || data.length === 0) {
      return { values: [], labels: [] };
    }

    console.log('🎯 Procesando datos mixtos con configuración original');

    const firstRow = data[0];
    const keys = Object.keys(firstRow);
    
    // Para gráficos mixtos, intentar detectar el patrón de series
    const hasMultipleColumns = keys.length >= 4; // fecha, serie, tipo, valor
    
    if (hasMultipleColumns) {
      // Buscar columnas clave
      const fechaKey = keys.find(k => k.toLowerCase().includes('fecha') || k.toLowerCase().includes('date')) || keys[0];
      const tipoKey = keys.find(k => k.toLowerCase().includes('tipo') || k.toLowerCase().includes('type'));
      const serieKey = keys.find(k => k.toLowerCase().includes('serie') || k.toLowerCase().includes('name') || k.toLowerCase().includes('label'));
      const valorKey = keys.find(k => k.toLowerCase().includes('volumen') || k.toLowerCase().includes('valor') || typeof data[0][k] === 'number');

      if (fechaKey && valorKey) {
        const labels = [...new Set(data.map(row => row[fechaKey]))].sort();
        
        // Si hay columna de tipo, usar para determinar tipo de serie
        if (tipoKey && serieKey) {
          const seriesMap = new Map();
          
          data.forEach(row => {
            const serieId = `${row[serieKey]}_${row[tipoKey]}`;
            if (!seriesMap.has(serieId)) {
              seriesMap.set(serieId, {
                name: row[serieKey],
                type: row[tipoKey] === 'bar' ? 'bar' : 'line',
                data: new Array(labels.length).fill(0),
                yAxisID: row[tipoKey] === 'bar' ? 'y1' : 'y'
              });
            }
            
            const labelIndex = labels.indexOf(row[fechaKey]);
            if (labelIndex !== -1) {
              seriesMap.get(serieId).data[labelIndex] = Number(row[valorKey]) || 0;
            }
          });

          return {
            labels,
            values: Array.from(seriesMap.values()),
            axes: originalAxes, // Preservar ejes originales
            chart_type: 'mixed'
          };
        }
        
        // Si hay múltiples series pero sin tipo explícito
        if (serieKey) {
          const series = [...new Set(data.map(row => row[serieKey]))];
          
          const values = series.map((serie, index) => {
            const serieData = data.filter(row => row[serieKey] === serie);
            
            return {
              name: serie,
              type: index % 2 === 0 ? 'line' : 'bar', // Alternar tipos para preservar carácter mixto
              data: labels.map(label => {
                const row = serieData.find(r => r[fechaKey] === label);
                return row ? Number(row[valorKey]) || 0 : 0;
              }),
              yAxisID: index % 2 === 0 ? 'y' : 'y1'
            };
          });

          return {
            labels,
            values,
            axes: originalAxes, // Preservar ejes originales
            chart_type: 'mixed'
          };
        }
      }
    }

    // Fallback: usar procesamiento estándar pero forzar tipo mixto
    const standardProcessed = processChartData(data);
    
    return {
      ...standardProcessed,
      chart_type: 'mixed',
      axes: originalAxes // Preservar ejes originales
    };
  };

// 🔧 FUNCIÓN CON DEBUG ESPECÍFICO PARA SQL
const refreshChart = async (chartId, sql, originalChartType, originalAxes) => {
  try {
    setRefreshingChart(chartId);
    console.log(`🔄 Actualizando gráfico ${chartId} con SQL:`, sql);
    console.log(`🎯 Tipo original: ${originalChartType}`);
    
    // Ejecutar SQL con debug detallado
    console.log('🚀 Ejecutando SQL en Supabase...');
    const sqlResult = await supabase.rpc('execute_sql', { query: sql });
    
    console.log('📦 Respuesta completa de Supabase:', sqlResult);
    console.log('📦 sqlResult.data:', sqlResult.data);
    console.log('📦 sqlResult.error:', sqlResult.error);
    console.log('📦 Tipo de sqlResult:', typeof sqlResult);
    console.log('📦 Tipo de sqlResult.data:', typeof sqlResult.data);
    console.log('📦 Es array sqlResult.data:', Array.isArray(sqlResult.data));
    
    if (sqlResult.error) {
      console.error('❌ Error en execute_sql:', sqlResult.error);
      throw new Error('Error al ejecutar SQL: ' + sqlResult.error.message);
    }

    const data = sqlResult.data;
    
    // Debug más detallado de los datos
    console.log('🔍 ANÁLISIS DETALLADO DE DATOS:');
    console.log('- data:', data);
    console.log('- typeof data:', typeof data);
    console.log('- Array.isArray(data):', Array.isArray(data));
    console.log('- data === null:', data === null);
    console.log('- data === undefined:', data === undefined);
    console.log('- JSON.stringify(data):', JSON.stringify(data));
    
    if (data && typeof data === 'object') {
      console.log('- Object.keys(data):', Object.keys(data));
      console.log('- data.length:', data.length);
    }

    if (!data) {
      console.error('❌ Data es null o undefined');
      alert('El SQL no devolvió datos. Verifica tu consulta.');
      return;
    }

    // Verificar si data es un array
    if (!Array.isArray(data)) {
      console.error('❌ Data no es un array:', data);
      
      // Intentar diferentes estrategias de recuperación
      if (typeof data === 'object' && data !== null) {
        console.log('🔧 Intentando estrategias de recuperación...');
        
        // Estrategia 1: ¿Es un objeto con una propiedad que contiene el array?
        const objectKeys = Object.keys(data);
        console.log('🔧 Keys del objeto:', objectKeys);
        
        for (const key of objectKeys) {
          if (Array.isArray(data[key])) {
            console.log(`🔧 Encontrado array en data.${key}:`, data[key]);
            data = data[key];
            break;
          }
        }
        
        // Estrategia 2: ¿Es un objeto que representa una fila?
        if (!Array.isArray(data) && typeof data === 'object') {
          console.log('🔧 Convirtiendo objeto único a array');
          data = [data];
        }
      }
      
      // Si aún no es array, fallar
      if (!Array.isArray(data)) {
        console.error('❌ No se pudo convertir data a array:', data);
        alert('El SQL devolvió un formato de datos inválido. Formato recibido: ' + typeof data);
        return;
      }
    }

    if (data.length === 0) {
      console.error('❌ Data está vacío');
      alert('La consulta SQL no devolvió datos. Verifica tu consulta.');
      return;
    }

    // Mostrar estructura del primer registro
    console.log('🔍 Primer registro:', data[0]);
    console.log('🔍 Keys del primer registro:', Object.keys(data[0] || {}));
    console.log('🔍 Todos los registros:', data);

    // Procesar datos
    let processedData;
    
    try {
      if (originalChartType === 'mixed' && originalAxes) {
        console.log('🎯 Procesando gráfico mixto preservando configuración original');
        processedData = processChartDataPreservingMixed(data, originalChartType, originalAxes);
      } else {
        console.log('📊 Procesando gráfico estándar');
        processedData = processChartData(data);
      }

      console.log('🎯 Datos procesados exitosamente:', processedData);

    } catch (processError) {
      console.error('❌ Error en procesamiento de datos:', processError);
      console.error('❌ Stack trace:', processError.stack);
      throw new Error('Error al procesar datos: ' + processError.message);
    }

    // Validar datos procesados
    if (!processedData || !processedData.values || !processedData.labels) {
      console.error('❌ processedData inválido:', processedData);
      throw new Error('Error: Los datos procesados no tienen la estructura correcta');
    }

    // Preparar datos para actualización
    const updateData = {
      values: processedData.values,
      labels: processedData.labels,
      updated_at: new Date().toISOString()
    };

    console.log('💾 Datos para actualizar en BD:', updateData);

    // Preservar ejes si es necesario
    if (originalChartType === 'mixed' && originalAxes) {
      updateData.axes = originalAxes;
      console.log('🎯 Preservando ejes originales:', originalAxes);
    } else if (processedData.axes) {
      updateData.axes = processedData.axes;
      console.log('🎯 Usando nuevos ejes:', processedData.axes);
    }

    // Actualizar en base de datos
    const { error: updateError } = await supabase
      .from('graficos')
      .update(updateData)
      .eq('id', chartId);

    if (updateError) {
      console.error('❌ Error al actualizar en BD:', updateError);
      throw new Error('Error al actualizar gráfico: ' + updateError.message);
    }

    console.log('✅ Gráfico actualizado en BD');

    setChartRenderKeys(prev => ({
      ...prev,
      [chartId]: Date.now()
    }));

    setTimeout(async () => {
      await fetchDashboardsByCategory(currentCategory.id);
      alert('¡Gráfico actualizado exitosamente!');
    }, 500);
    
  } catch (err) {
    console.error('❌ Error completo al actualizar gráfico:', err);
    console.error('❌ Stack trace:', err.stack);
    alert('Error al actualizar gráfico: ' + err.message);
  } finally {
    setRefreshingChart(null);
  }
};
  // Función para eliminar dashboard
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

      await fetchDashboardsByCategory(currentCategory.id);
    } catch (err) {
      console.error('Error al eliminar dashboard:', err);
      alert('Error al eliminar dashboard: ' + err.message);
    }
  };

// Función processChartData con validaciones de seguridad mejoradas
const processChartData = (data) => {
  console.log('🔍 [processChartData] Iniciando procesamiento con data:', data);
  console.log('🔍 [processChartData] Tipo de data:', typeof data);
  console.log('🔍 [processChartData] Es array:', Array.isArray(data));
  
  // Validación inicial más robusta
  if (!data) {
    console.error('❌ [processChartData] Data es null o undefined');
    return { values: [], labels: [] };
  }

  if (!Array.isArray(data)) {
    console.error('❌ [processChartData] Data no es un array:', data);
    return { values: [], labels: [] };
  }

  if (data.length === 0) {
    console.error('❌ [processChartData] Data está vacío');
    return { values: [], labels: [] };
  }

  const firstRow = data[0];
  console.log('🔍 [processChartData] Primer registro:', firstRow);
  
  // Validación del primer registro
  if (!firstRow || typeof firstRow !== 'object') {
    console.error('❌ [processChartData] Primer registro es inválido:', firstRow);
    return { values: [], labels: [] };
  }

  let keys;
  try {
    keys = Object.keys(firstRow);
    console.log('🔍 [processChartData] Keys obtenidas:', keys);
  } catch (error) {
    console.error('❌ [processChartData] Error al obtener keys:', error);
    return { values: [], labels: [] };
  }

  if (!keys || keys.length === 0) {
    console.error('❌ [processChartData] No hay keys válidas');
    return { values: [], labels: [] };
  }
  
  console.log('🔍 [processChartData] Analizando estructura de datos...');
  
  // Detectar columnas por tipo con validaciones
  const textColumns = [];
  const numericColumns = [];
  const dateColumns = [];
  
  keys.forEach(k => {
    try {
      const sampleValue = data[0][k];
      console.log(`🔍 [processChartData] Analizando columna "${k}":`, sampleValue, typeof sampleValue);
      
      if (k.toLowerCase().includes('fecha') || k.toLowerCase().includes('date')) {
        dateColumns.push(k);
      } else if (typeof sampleValue === "string" && isNaN(Number(sampleValue))) {
        textColumns.push(k);
      } else if (typeof sampleValue === "number" || (!isNaN(Number(sampleValue)) && sampleValue !== null && sampleValue !== '')) {
        numericColumns.push(k);
      } else {
        textColumns.push(k); // Default a texto si no se puede clasificar
      }
    } catch (error) {
      console.error(`❌ [processChartData] Error al analizar columna "${k}":`, error);
      textColumns.push(k); // Default a texto en caso de error
    }
  });
  
  console.log('📊 [processChartData] Análisis de columnas:', { textColumns, numericColumns, dateColumns });

  // 1. CASO ESPECIAL: Gráficos mixtos con columna "type" o "tipo"
  const hasTypeColumn = keys.some(key => 
    key && (key.toLowerCase().includes('type') || key.toLowerCase().includes('tipo'))
  );
  
  if (hasTypeColumn) {
    console.log('🎯 [processChartData] Detectado gráfico mixto');
    
    const typeKey = keys.find(key => 
      key && (key.toLowerCase().includes('type') || key.toLowerCase().includes('tipo'))
    );
    const valueKey = numericColumns.find(k => k !== typeKey);
    const labelKey = dateColumns.length > 0 ? dateColumns[0] : textColumns[0];
    const nameKey = keys.find(k => k !== labelKey && k !== typeKey && k !== valueKey);

    if (typeKey && valueKey && labelKey) {
      try {
        const labels = [...new Set(data.map(row => row && row[labelKey] ? row[labelKey] : 'Sin label'))].sort();
        const series = [...new Set(data.map(row => row && row[nameKey || 'serie'] ? row[nameKey || 'serie'] : 'Sin serie'))];
        
        const values = series.map(serie => {
          const serieData = data.filter(row => row && row[nameKey || 'serie'] === serie);
          const serieType = serieData[0] && serieData[0][typeKey] ? serieData[0][typeKey] : 'line';
          
          return {
            name: serie,
            type: serieType,
            data: labels.map(label => {
              const row = serieData.find(r => r && r[labelKey] === label);
              return row && row[valueKey] ? Number(row[valueKey]) : 0;
            }),
            yAxisID: serieType === 'bar' ? 'y1' : 'y'
          };
        });

        const axes = [
          { id: 'y', position: 'left', title: 'Líneas', beginAtZero: true },
          { id: 'y1', position: 'right', title: 'Barras', beginAtZero: true }
        ];

        console.log('✅ [processChartData] Gráfico mixto procesado exitosamente');
        return { labels, values, axes, chart_type: 'mixed' };
      } catch (error) {
        console.error('❌ [processChartData] Error procesando gráfico mixto:', error);
        return { values: [], labels: [] };
      }
    }
  }

  // 2. CASO: Datos simples de 2 columnas (etiqueta + valor)
  if (keys.length === 2) {
    console.log('📊 [processChartData] Procesando gráfico simple de 2 columnas');
    
    try {
      const labelKey = textColumns[0] || dateColumns[0] || keys[0];
      const valueKey = numericColumns[0] || keys[1];
      
      console.log('📊 [processChartData] Gráfico simple 2 columnas:', { labelKey, valueKey });
      
      const labels = data.map(row => row && row[labelKey] ? row[labelKey] : 'Sin label');
      const values = data.map(row => row && row[valueKey] ? Number(row[valueKey]) || 0 : 0);
      
      console.log('✅ [processChartData] Gráfico simple procesado exitosamente');
      return { labels, values };
    } catch (error) {
      console.error('❌ [processChartData] Error procesando gráfico simple:', error);
      return { values: [], labels: [] };
    }
  }

  // 3. CASO: Para tu SQL específico - múltiples columnas numéricas como series
  if (numericColumns.length > 1) {
    console.log('📊 [processChartData] Detectadas múltiples columnas numéricas - creando multi-línea');
    
    try {
      const labelKey = textColumns[0] || dateColumns[0] || keys[0];
      
      console.log('📊 [processChartData] Multi-línea con:', { 
        labelKey, 
        numericColumns 
      });
      
      // Para tu caso: fecha, volumen_arauco, volumen_chillan
      const labels = data.map(row => row && row[labelKey] ? row[labelKey] : 'Sin fecha');
      
      const multiLineData = numericColumns.map(key => ({
        label: key,
        data: data.map(row => row && row[key] ? Number(row[key]) || 0 : 0)
      }));
      
      console.log('✅ [processChartData] Multi-línea procesado exitosamente');
      console.log('📊 [processChartData] Labels:', labels);
      console.log('📊 [processChartData] Series:', multiLineData);
      
      return {
        labels: labels,
        values: multiLineData
      };
    } catch (error) {
      console.error('❌ [processChartData] Error procesando multi-línea:', error);
      return { values: [], labels: [] };
    }
  }

  // 4. CASO: Datos de 3 columnas (fecha/categoría + serie + valor)
  if (keys.length === 3 && numericColumns.length === 1) {
    console.log('📊 [processChartData] Procesando datos de 3 columnas');
    
    try {
      const valueKey = numericColumns[0];
      const labelKey = dateColumns.length > 0 ? dateColumns[0] : textColumns[0];
      const serieKey = keys.find(k => k !== valueKey && k !== labelKey);
      
      console.log('📊 [processChartData] Datos de 3 columnas:', { labelKey, serieKey, valueKey });
      
      const labels = [...new Set(data.map(row => row && row[labelKey] ? row[labelKey] : 'Sin label'))].sort();
      const series = [...new Set(data.map(row => row && row[serieKey] ? row[serieKey] : 'Sin serie'))];
      
      // Si solo hay una serie, hacer gráfico simple
      if (series.length === 1) {
        const values = labels.map(label => {
          const row = data.find(r => r && r[labelKey] === label);
          return row && row[valueKey] ? Number(row[valueKey]) : 0;
        });
        
        console.log('✅ [processChartData] Serie única procesada como gráfico simple');
        return { labels, values };
      }
      
      // Multi-serie
      const values = series.map(serie => ({
        label: serie,
        data: labels.map(label => {
          const row = data.find(r => r && r[labelKey] === label && r[serieKey] === serie);
          return row && row[valueKey] ? Number(row[valueKey]) : 0;
        })
      }));
      
      console.log('✅ [processChartData] Multi-serie procesado exitosamente');
      return { labels, values };
    } catch (error) {
      console.error('❌ [processChartData] Error procesando datos de 3 columnas:', error);
      return { values: [], labels: [] };
    }
  }

  // 5. FALLBACK: Usar primera columna numérica
  console.log('📊 [processChartData] Usando fallback');
  
  try {
    const fallbackValueKey = numericColumns[0] || keys.find(k => k && data[0][k] && !isNaN(Number(data[0][k])));
    const fallbackLabelKey = keys.find(k => k !== fallbackValueKey) || keys[0];
    
    console.log('📊 [processChartData] Fallback simple:', { fallbackLabelKey, fallbackValueKey });
    
    const labels = data.map(row => row && row[fallbackLabelKey] ? row[fallbackLabelKey] : `Item ${data.indexOf(row) + 1}`);
    const values = data.map(row => row && row[fallbackValueKey] ? Number(row[fallbackValueKey]) || 0 : 0);
    
    console.log('✅ [processChartData] Fallback procesado exitosamente');
    return { labels, values };
  } catch (error) {
    console.error('❌ [processChartData] Error en fallback:', error);
    return { values: [], labels: [] };
  }
};

  const safeJsonParse = (jsonString, fallback = null) => {
    if (!jsonString) return fallback;
    if (typeof jsonString !== 'string') return jsonString;
    
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return fallback;
    }
  };

  // Función para renderizar gráficos (mantenemos la misma lógica)
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

    // Renderizado según tipo de gráfico con estilos unificados
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
    fetchCategories();
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
              onClick={fetchCategories}
              className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (dashboards.length === 0 && currentCategory) {
    return (
      <div className="min-h-screen bg-[url('/camioncito.png')] bg-cover bg-fixed bg-bottom p-6">
        {/* HEADER DE NAVEGACIÓN */}
        <div className="flex justify-between items-center bg-white/90 dark:bg-[#1c2e1f]/90 px-6 py-3 rounded-xl shadow mb-6 max-w-7xl mx-auto border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
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
              No hay gráficos en esta categoría
            </div>
            <div className="text-gray-400">
              Crea gráficos con el agente de IA y guárdalos en esta categoría
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (categories.length === 0 && !currentCategory) {
    return (
      <div className="min-h-screen bg-[url('/camioncito.png')] bg-cover bg-fixed bg-bottom p-6">
        {/* HEADER DE NAVEGACIÓN */}
        <div className="flex justify-between items-center bg-white/90 dark:bg-[#1c2e1f]/90 px-6 py-3 rounded-xl shadow mb-6 max-w-7xl mx-auto border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
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
            <div className="text-6xl mb-4">📁</div>
            <div className="text-gray-600 dark:text-white text-lg mb-2">
              No tienes categorías creadas
            </div>
            <div className="text-gray-400 mb-4">
              Crea tu primera categoría para organizar tus gráficos
            </div>
            <button 
              onClick={() => setShowCreateCategory(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300"
            >
              <FaPlus className="inline mr-2" /> Crear Categoría
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[url('/camioncito.png')] bg-cover bg-fixed bg-bottom p-6">
      {/* HEADER DE NAVEGACIÓN */}
      <div className="flex justify-between items-center bg-white/90 dark:bg-[#1c2e1f]/90 px-6 py-3 rounded-xl shadow mb-6 max-w-7xl mx-auto border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
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
      <div className="bg-white/90 dark:bg-[#1c2e1f]/90 rounded-xl shadow-lg max-w-7xl mx-auto border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        
        {/* VISTA DE CATEGORÍAS */}
        {!currentCategory && (
          <>
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">📁 Mis Dashboards</h1>
                <p className="text-gray-600 dark:text-gray-300">Organiza tus gráficos por categorías temáticas con layout flexible</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCreateCategory(true)}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                >
                  <FaPlus /> Nueva Categoría
                </button>
                <button 
                  onClick={fetchCategories}
                  className="px-6 py-3 bg-gradient-to-r from-[#D2C900] to-[#bcae00] text-black rounded-lg hover:from-[#bcae00] hover:to-[#a89800] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  🔄 Refrescar
                </button>
              </div>
            </div>

            {/* Grid de Categorías */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((category) => (
                  <div 
                    key={category.id}
                    onClick={() => {
                      setCurrentCategory(category);
                      fetchDashboardsByCategory(category.id);
                    }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 hover:scale-105 overflow-hidden border border-gray-100 dark:border-gray-700 cursor-pointer group"
                  >
                    <div 
                      className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center border-b border-gray-200 dark:border-gray-600"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      <div className="text-4xl group-hover:scale-110 transition-transform duration-300">
                        {category.icon || '📁'}
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                        {category.name}
                      </h3>
                      
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 min-h-[40px]">
                        {category.description || 'Sin descripción'}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <FaChartBar />
                          <span>{category.chart_count} gráfico{category.chart_count !== 1 ? 's' : ''}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span>📅 {new Date(category.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <div className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs rounded-full group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-300">
                          Ver Dashboard
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* VISTA DE DASHBOARD INDIVIDUAL CON LAYOUT FLEXIBLE */}
        {currentCategory && (
          <>
            {/* Header con breadcrumbs y controles de layout */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    setCurrentCategory(null);
                    setDashboards([]);
                    setEditMode(false);
                  }}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                >
                  <FaArrowLeft className="text-xl" />
                </button>
                
                <div>
                  <nav className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    <span className="hover:underline cursor-pointer" onClick={() => setCurrentCategory(null)}>
                      Dashboards
                    </span> 
                    <span className="mx-2">/</span> 
                    <span className="text-gray-800 dark:text-white font-medium">
                      {currentCategory.name}
                    </span>
                  </nav>
                  
                  <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                    <span className="text-2xl">{currentCategory.icon}</span>
                    {currentCategory.name}
                  </h1>
                  
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    {currentCategory.description || 'Dashboard con layout flexible y gráficos mixtos preservados'}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                {/* Botón de modo edición */}
                <button 
                  onClick={() => setEditMode(!editMode)}
                  className={`px-6 py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2 ${
                    editMode 
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700' 
                      : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700'
                  }`}
                >
                  <FaExpandArrowsAlt />
                  {editMode ? 'Salir de Edición' : 'Editar Layout'}
                </button>
                
                <button 
                  onClick={() => fetchDashboardsByCategory(currentCategory.id)}
                  className="px-6 py-3 bg-gradient-to-r from-[#D2C900] to-[#bcae00] text-black rounded-lg hover:from-[#bcae00] hover:to-[#a89800] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  🔄 Refrescar
                </button>
              </div>
            </div>

            {/* Información del modo edición */}
            {editMode && (
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 border-b border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <FaExpandArrowsAlt />
                  <span className="font-medium">Modo Edición Activo</span>
                  <span className="text-sm">
                    - Usa los controles en la esquina superior derecha de cada gráfico para cambiar su tamaño
                  </span>
                </div>
              </div>
            )}

            {/* Grid flexible de gráficos */}
            <div className="p-6">
              <div className="grid grid-cols-12 gap-6">
                {dashboards.map((dashboard) => {
                  const grafico = dashboard.graficos && dashboard.graficos.length > 0 ? dashboard.graficos[0] : null;
                  
                  if (!grafico) return null;
                  
                  return (
                    <div 
                      key={dashboard.id} 
                      className={`${getChartSizeClasses(grafico.id)} relative`}
                    >
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 h-full">
                        {/* Selector de tamaño (solo en modo edición) */}
                        <SizeSelector chartId={grafico.id} currentSize={chartSizes[grafico.id]} />
                        
                        {/* Header compacto de la tarjeta */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                          <div className="flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-gray-800 dark:text-white truncate">
                                {grafico.title || dashboard.name || 'Sin título'}
                              </h3>
                              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center bg-white dark:bg-gray-700 px-2 py-1 rounded-full">
                                  {grafico.chart_type === 'bar' && '📊'}
                                  {grafico.chart_type === 'pie' && '🥧'}
                                  {grafico.chart_type === 'line' && '📈'}
                                  {grafico.chart_type === 'multi-line' && '📊'}
                                  {grafico.chart_type === 'mixed' && '🎯'}
                                  <span className="ml-1 capitalize">
                                    {grafico.chart_type === 'mixed' ? 'Mixto' : grafico.chart_type}
                                  </span>
                                </span>
                                {/* Información de ejes para gráficos mixtos */}
                                {grafico.chart_type === 'mixed' && grafico.axes && (
                                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                                    {safeJsonParse(grafico.axes, []).length} ejes
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {!editMode && (
                              <div className="flex space-x-1 ml-2">
                                <button
                                  onClick={() => refreshChart(
                                    grafico.id, 
                                    grafico.sql, 
                                    grafico.chart_type,  // 🆕 Pasar tipo original
                                    grafico.axes         // 🆕 Pasar ejes originales
                                  )}
                                  disabled={refreshingChart === grafico.id}
                                  className="p-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs rounded hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition-all duration-300"
                                  title="Actualizar datos"
                                >
                                  {refreshingChart === grafico.id ? '⏳' : '🔄'}
                                </button>
                                <button
                                  onClick={() => deleteDashboard(dashboard.id)}
                                  className="p-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded hover:from-red-600 hover:to-red-700 transition-all duration-300"
                                  title="Eliminar gráfico"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Contenido del gráfico con altura dinámica */}
                        <div className="p-4">
                          <div className={`${getChartHeight(grafico.id)} relative bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 rounded-lg`}>
                            {renderChart(grafico)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL PARA CREAR CATEGORÍA */}
      {showCreateCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                ➕ Nueva Categoría
              </h2>
              <button 
                onClick={() => setShowCreateCategory(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre de la categoría *
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  placeholder="Ej: Producción, Ventas, Finanzas..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Icono
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['📊', '🏭', '💰', '📈', '👥', '🎯', '📋', '⚙️', '🌟', '📦'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setNewCategory({...newCategory, icon: emoji})}
                      className={`p-2 text-2xl rounded-lg border-2 transition-all duration-200 ${
                        newCategory.icon === emoji 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' 
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                  placeholder="Describe el propósito de esta categoría..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color del tema
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewCategory({...newCategory, color})}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                        newCategory.color === color 
                          ? 'border-gray-800 dark:border-white scale-110' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button 
                onClick={() => setShowCreateCategory(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={createCategory}
                disabled={!newCategory.name.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                Crear Categoría
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
