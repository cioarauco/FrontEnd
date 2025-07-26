import React, { useState, useEffect } from 'react';
import { supabase } from '../App';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

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

  // Función para obtener los dashboards del usuario
  const fetchDashboards = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener el usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error('Error al obtener usuario: ' + userError.message);
      }

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Consulta para obtener dashboards con sus gráficos
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
            sql,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error('Error al obtener dashboards: ' + error.message);
      }

      console.log('Dashboards obtenidos:', data); // Para debugging
      setDashboards(data || []);
    } catch (err) {
      console.error('Error en fetchDashboards:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función para actualizar un gráfico ejecutando su SQL
  const refreshChart = async (chartId, sql) => {
    try {
      setRefreshingChart(chartId);
      
      // Ejecutar la query SQL
      const { data, error } = await supabase.rpc('execute_sql', { query: sql });
      
      if (error) {
        throw new Error('Error al ejecutar SQL: ' + error.message);
      }

      // Actualizar el gráfico en la base de datos
      const processedData = processChartData(data);
      
      const { error: updateError } = await supabase
        .from('graficos')
        .update({
          values: processedData.values,
          labels: processedData.labels
        })
        .eq('id', chartId);

      if (updateError) {
        throw new Error('Error al actualizar gráfico: ' + updateError.message);
      }

      // Refrescar los dashboards
      await fetchDashboards();
      
    } catch (err) {
      console.error('Error al actualizar gráfico:', err);
      alert('Error al actualizar gráfico: ' + err.message);
    } finally {
      setRefreshingChart(null);
    }
  };

  // Función mejorada para procesar datos del SQL
  const processChartData = (data) => {
    if (!data || data.length === 0) {
      return { values: [], labels: [] };
    }

    const firstRow = data[0];
    const keys = Object.keys(firstRow);
    
    // Si hay exactamente 2 columnas, usar una como labels y otra como values (para gráficos simples)
    if (keys.length === 2) {
      return {
        labels: data.map(row => row[keys[0]]),
        values: data.map(row => row[keys[1]])
      };
    }
    
    // Para gráficos multi-line: primera columna como labels, resto como series de datos
    if (keys.length > 2) {
      const labelKey = keys[0];
      const valueKeys = keys.slice(1);
      
      return {
        labels: data.map(row => row[labelKey]),
        values: valueKeys.map(key => ({
          label: key,
          data: data.map(row => row[key])
        }))
      };
    }
    
    // Fallback para una sola columna
    return {
      labels: data.map((_, index) => `Item ${index + 1}`),
      values: data.map(row => row[keys[0]])
    };
  };

  // Función para generar colores automáticamente
  const generateColors = (count) => {
    const colors = [
      'rgba(255, 99, 132, 0.8)',
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 205, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 159, 64, 0.8)',
      'rgba(199, 199, 199, 0.8)',
      'rgba(83, 102, 255, 0.8)',
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
    ];
    
    return {
      backgrounds: Array.from({ length: count }, (_, i) => colors[i % colors.length]),
      borders: Array.from({ length: count }, (_, i) => borderColors[i % borderColors.length])
    };
  };

  // Función mejorada para renderizar un gráfico
  const renderChart = (grafico) => {
    if (!grafico.values || !grafico.labels) {
      return <div className="text-gray-500">No hay datos para mostrar</div>;
    }

    let chartData;
    let values = grafico.values;
    let labels = grafico.labels;

    // Parsear si los datos están como string JSON
    if (typeof values === 'string') {
      try {
        values = JSON.parse(values);
      } catch (e) {
        console.error('Error parsing values:', e);
        return <div className="text-red-500">Error en los datos del gráfico</div>;
      }
    }

    if (typeof labels === 'string') {
      try {
        labels = JSON.parse(labels);
      } catch (e) {
        console.error('Error parsing labels:', e);
        return <div className="text-red-500">Error en las etiquetas del gráfico</div>;
      }
    }

    // Configurar datos según el tipo de gráfico
    switch (grafico.chart_type) {
      case 'bar':
        chartData = {
          labels: labels,
          datasets: [{
            label: 'Datos',
            data: values,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        };
        return <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />;

      case 'pie':
        const pieColors = generateColors(Array.isArray(values) ? values.length : 1);
        chartData = {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: pieColors.backgrounds,
            borderColor: pieColors.borders,
            borderWidth: 1
          }]
        };
        return <Pie data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />;

      case 'line':
        chartData = {
          labels: labels,
          datasets: [{
            label: 'Datos',
            data: values,
            fill: false,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
          }]
        };
        return <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} />;

      case 'multi-line':
        // Para gráficos multi-línea, values debe ser un array de objetos con label y data
        let datasets = [];
        
        if (Array.isArray(values) && values.length > 0) {
          // Si values es un array de objetos con estructura {label, data}
          if (typeof values[0] === 'object' && values[0].label && values[0].data) {
            const colors = generateColors(values.length);
            datasets = values.map((series, index) => ({
              label: series.label,
              data: series.data,
              borderColor: colors.borders[index],
              backgroundColor: colors.backgrounds[index],
              fill: false,
              tension: 0.1
            }));
          } 
          // Si values es un array 2D (array de arrays)
          else if (Array.isArray(values[0])) {
            const colors = generateColors(values.length);
            datasets = values.map((series, index) => ({
              label: `Serie ${index + 1}`,
              data: series,
              borderColor: colors.borders[index],
              backgroundColor: colors.backgrounds[index],
              fill: false,
              tension: 0.1
            }));
          }
          // Si values es un array simple, crear una sola línea
          else {
            datasets = [{
              label: 'Datos',
              data: values,
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              fill: false,
              tension: 0.1
            }];
          }
        }

        chartData = {
          labels: labels,
          datasets: datasets
        };
        
        return <Line data={chartData} options={{ 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }} />;

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

      // Refrescar la lista
      await fetchDashboards();
    } catch (err) {
      console.error('Error al eliminar dashboard:', err);
      alert('Error al eliminar dashboard: ' + err.message);
    }
  };

  useEffect(() => {
    fetchDashboards();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando dashboards...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <div className="text-red-800">
          <strong>Error:</strong> {error}
        </div>
        <button 
          onClick={fetchDashboards}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (dashboards.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">
          No tienes gráficos guardados en tus dashboards
        </div>
        <div className="text-gray-400 mt-2">
          Crea gráficos con el agente de IA y guárdalos para verlos aquí
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Mis Dashboards</h1>
        <button 
          onClick={fetchDashboards}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Refrescar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboards.map((dashboard) => {
          // Corregir el acceso a los gráficos - pueden ser un array o un objeto
          const graficos = Array.isArray(dashboard.graficos) ? dashboard.graficos : [dashboard.graficos];
          
          return graficos.map((grafico) => {
            if (!grafico) {
              return (
                <div key={`${dashboard.id}-no-chart`} className="bg-white rounded-lg shadow-md p-6">
                  <div className="text-red-500">Gráfico no encontrado</div>
                </div>
              );
            }

            return (
              <div key={`${dashboard.id}-${grafico.id}`} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">
                    {grafico.title || 'Sin título'}
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => refreshChart(grafico.id, grafico.sql)}
                      disabled={refreshingChart === grafico.id}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {refreshingChart === grafico.id ? 'Actualizando...' : 'Actualizar'}
                    </button>
                    <button
                      onClick={() => deleteDashboard(dashboard.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                
                <div className="mb-4">
                  <span className="text-sm text-gray-500">
                    Tipo: {grafico.chart_type} | Creado: {new Date(grafico.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="h-64 relative">
                  {renderChart(grafico)}
                </div>
              </div>
            );
          });
        })}
      </div>
    </div>
  );
};

export default DashboardPage;
