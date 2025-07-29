// ChartInline.jsx – optimizado para fondo naranja con soporte MIXTO
import React from "react";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Legend,
  Tooltip,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Legend,
  Tooltip,
  Filler
);

// 🎨 Paleta optimizada para fondo naranja - colores que contrastan bien
const COLORS = [
  "#1e40af", // blue-700 (contraste fuerte con naranja)
  "#059669", // emerald-600 (verde profundo)
  "#7c3aed", // violet-600 (púrpura elegante)
  "#0891b2", // cyan-600 (azul verdoso)
  "#be185d", // pink-700 (magenta profundo)
  "#047857", // emerald-700 (verde oscuro)
  "#4338ca", // indigo-700 (índigo profundo)
];

// 🌟 Paleta alternativa más suave y moderna
const SOFT_COLORS = [
  "#3b82f6", // blue-500
  "#06b6d4", // cyan-500  
  "#8b5cf6", // violet-500
  "#10b981", // emerald-500
  "#f43f5e", // rose-500
  "#6366f1", // indigo-500
  "#84cc16", // lime-500
];

// Utilidad para agregar transparencia a un color HEX
const withAlpha = (hex, alpha) => {
  const [r, g, b] = hex
    .replace("#", "")
    .match(/.{1,2}/g)
    .map((x) => parseInt(x, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function ChartInline({ data, colorScheme = "default" }) {
  if (!data || !data.labels || !data.values) return null;

  // Seleccionar paleta de colores
  const selectedColors = colorScheme === "soft" ? SOFT_COLORS : COLORS;

  const isMultiSeries =
    Array.isArray(data.values) && typeof data.values[0] === "object";

  // 🔥 NUEVO: Detectar si es gráfico mixto
  const isMixedChart = data.chart_type === "mixed" || data.chart_type === "mixed-chart";
  
  // 🔥 NUEVO: Obtener configuración de gráfico mixto
  const mixedConfig = data.chart_config || {};
  const { seriesTypes = {}, yAxes = {} } = mixedConfig;

  // 🗂️ Construcción dinámica de datasets con colores optimizados
  const datasets = isMultiSeries
    ? data.values.map((serie, idx) => {
        const serieKey = serie.name || serie.label || `serie_${idx}`;
        const serieType = seriesTypes[serieKey] || "line"; // Por defecto línea
        const yAxisID = yAxes[serieKey] || "y"; // Eje Y por defecto
        
        const baseDataset = {
          label: serieKey,
          data: serie.data,
          borderColor: selectedColors[idx % selectedColors.length],
          backgroundColor: withAlpha(selectedColors[idx % selectedColors.length], 0.4),
          pointBackgroundColor: selectedColors[idx % selectedColors.length],
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 3,
          yAxisID: yAxisID, // 🔥 NUEVO: Asignar eje Y
        };

        // 🔥 NUEVO: Configuración específica por tipo de serie
        if (isMixedChart) {
          if (serieType === "bar") {
            return {
              ...baseDataset,
              type: "bar",
              backgroundColor: withAlpha(selectedColors[idx % selectedColors.length], 0.6),
              borderWidth: 1,
            };
          } else {
            return {
              ...baseDataset,
              type: "line",
              fill: false,
              tension: 0.4,
            };
          }
        }

        // Configuración normal (no mixto)
        return {
          ...baseDataset,
          backgroundColor:
            data.chart_type === "bar"
              ? withAlpha(selectedColors[idx % selectedColors.length], 0.4)
              : withAlpha(selectedColors[idx % selectedColors.length], 0.2),
          fill: data.chart_type === "multi-line",
          tension: 0.4,
        };
      })
    : [
        {
          label: data.title || "Serie",
          data: data.values,
          borderColor: selectedColors[0],
          backgroundColor:
            data.chart_type === "bar"
              ? withAlpha(selectedColors[0], 0.4)
              : withAlpha(selectedColors[0], 0.2),
          pointBackgroundColor: selectedColors[0],
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: data.chart_type === "line",
          tension: 0.4,
          borderWidth: 3,
        },
      ];

  const chartData = {
    labels: data.labels,
    datasets,
  };

  // ⚙️ NUEVO: Configurar escalas múltiples para gráficos mixtos
  const getMixedScales = () => {
    const scales = {
      x: {
        grid: {
          color: withAlpha("#374151", 0.3),
          lineWidth: 1,
        },
        ticks: {
          color: "#374151",
          font: { size: 12, weight: "500" },
          maxRotation: 45,
          minRotation: 0,
          autoSkip: true,
        },
        border: {
          color: "#374151",
          width: 1,
        },
      },
    };

    // 🔥 Eje Y principal (izquierdo)
    scales.y = {
      type: "linear",
      display: true,
      position: "left",
      grid: {
        color: withAlpha("#374151", 0.2),
        lineWidth: 1,
      },
      ticks: {
        color: "#374151",
        font: { size: 12, weight: "500" },
        beginAtZero: true,
      },
      border: {
        color: "#374151",
        width: 1,
      },
      title: {
        display: !!mixedConfig.leftAxisTitle,
        text: mixedConfig.leftAxisTitle || "Eje Izquierdo",
        color: "#374151",
        font: { size: 14, weight: "600" },
      },
    };

    // 🔥 Eje Y secundario (derecho) - solo si hay series que lo usen
    const hasRightAxis = Object.values(yAxes).includes("y1");
    if (hasRightAxis) {
      scales.y1 = {
        type: "linear",
        display: true,
        position: "right",
        grid: {
          drawOnChartArea: false, // Solo mostrar grid del eje principal
        },
        ticks: {
          color: "#7c3aed", // Color diferente para distinguir
          font: { size: 12, weight: "500" },
          beginAtZero: true,
        },
        border: {
          color: "#7c3aed",
          width: 1,
        },
        title: {
          display: !!mixedConfig.rightAxisTitle,
          text: mixedConfig.rightAxisTitle || "Eje Derecho",
          color: "#7c3aed",
          font: { size: 14, weight: "600" },
        },
      };
    }

    // 🔥 Tercer eje Y (opcional)
    const hasThirdAxis = Object.values(yAxes).includes("y2");
    if (hasThirdAxis) {
      scales.y2 = {
        type: "linear",
        display: true,
        position: "right",
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: "#059669", // Verde para el tercer eje
          font: { size: 12, weight: "500" },
          beginAtZero: true,
        },
        border: {
          color: "#059669",
          width: 1,
        },
        title: {
          display: !!mixedConfig.thirdAxisTitle,
          text: mixedConfig.thirdAxisTitle || "Tercer Eje",
          color: "#059669",
          font: { size: 14, weight: "600" },
        },
        // Desplazar hacia la derecha para no solapar con y1
        offset: true,
      };
    }

    return scales;
  };

  // ⚙️ Opciones mejoradas para mejor contraste con fondo naranja
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 16 },
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#1f2937",
          font: { size: 13, weight: "600" },
          boxWidth: 18,
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: "#111827f0",
        titleColor: "#ffffff",
        bodyColor: "#e5e7eb",
        titleFont: { size: 14, weight: "700" },
        bodyFont: { size: 13 },
        borderColor: "#374151",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: true,
        boxPadding: 6,
        // 🔥 NUEVO: Mostrar información del eje en tooltip para gráficos mixtos
        callbacks: isMixedChart ? {
          afterLabel: function(context) {
            const yAxisID = context.dataset.yAxisID;
            const axisNames = {
              'y': mixedConfig.leftAxisTitle || 'Eje Izquierdo',
              'y1': mixedConfig.rightAxisTitle || 'Eje Derecho',
              'y2': mixedConfig.thirdAxisTitle || 'Tercer Eje'
            };
            return yAxisID !== 'y' ? `(${axisNames[yAxisID]})` : '';
          }
        } : {},
      },
      title: {
        display: !!data.title,
        text: data.title,
        color: "#111827",
        font: { size: 18, weight: "700" },
        padding: { bottom: 20 },
      },
    },
    scales: isMixedChart ? getMixedScales() : {
      x: {
        grid: {
          color: withAlpha("#374151", 0.3),
          lineWidth: 1,
        },
        ticks: {
          color: "#374151",
          font: { size: 12, weight: "500" },
          maxRotation: 45,
          minRotation: 0,
          autoSkip: true,
        },
        border: {
          color: "#374151",
          width: 1,
        },
      },
      y: {
        grid: {
          color: withAlpha("#374151", 0.2),
          lineWidth: 1,
        },
        ticks: {
          color: "#374151",
          font: { size: 12, weight: "500" },
          beginAtZero: true,
        },
        border: {
          color: "#374151",
          width: 1,
        },
      },
    },
    // 🔥 NUEVO: Configuración específica para gráficos mixtos
    interaction: isMixedChart ? {
      mode: 'index',
      intersect: false,
    } : {},
  };

  // ⬇️ Wrapper con fondo sutil para mejor contraste
  const Wrapper = ({ children }) => (
    <div 
      style={{ 
        height: "400px",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        border: "1px solid rgba(229, 231, 235, 0.5)"
      }}
    >
      {children}
    </div>
  );

  // 🔥 NUEVO: Renderizar gráfico mixto
  if (isMixedChart) {
    return (
      <Wrapper>
        <Line data={chartData} options={options} />
      </Wrapper>
    );
  }

  // Renderizado normal según tipo
  switch (data.chart_type) {
    case "bar":
      return (
        <Wrapper>
          <Bar data={chartData} options={options} />
        </Wrapper>
      );
    case "pie":
      return (
        <Wrapper>
          <Pie data={chartData} options={options} />
        </Wrapper>
      );
    case "multi-line":
    case "line":
    default:
      return (
        <Wrapper>
          <Line data={chartData} options={options} />
        </Wrapper>
      );
  }
}
