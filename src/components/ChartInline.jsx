// ChartInline.jsx – optimizado para fondo naranja
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

  // 🗂️ Construcción dinámica de datasets con colores optimizados
  const datasets = isMultiSeries
    ? data.values.map((serie, idx) => ({
        label: serie.name,
        data: serie.data,
        borderColor: selectedColors[idx % selectedColors.length],
        backgroundColor:
          data.chart_type === "bar"
            ? withAlpha(selectedColors[idx % selectedColors.length], 0.4)
            : withAlpha(selectedColors[idx % selectedColors.length], 0.2),
        pointBackgroundColor: selectedColors[idx % selectedColors.length],
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: data.chart_type === "multi-line",
        tension: 0.4,
        borderWidth: 3,
      }))
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

  // ⚙️ Opciones mejoradas para mejor contraste con fondo naranja
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 16 },
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#1f2937", // gris muy oscuro para mejor legibilidad
          font: { size: 13, weight: "600" },
          boxWidth: 18,
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: "#111827f0", // casi negro con transparencia
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
      },
      title: {
        display: !!data.title,
        text: data.title,
        color: "#111827", // negro para máximo contraste
        font: { size: 18, weight: "700" },
        padding: { bottom: 20 },
      },
    },
    scales: {
      x: {
        grid: {
          color: withAlpha("#374151", 0.3), // gris oscuro sutil
          lineWidth: 1,
        },
        ticks: {
          color: "#374151", // gris oscuro para buena legibilidad
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
  };

  // ⬇️ Wrapper con fondo sutil para mejor contraste
  const Wrapper = ({ children }) => (
    <div 
      style={{ 
        height: "400px",
        backgroundColor: "rgba(255, 255, 255, 0.9)", // fondo blanco semi-transparente
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        border: "1px solid rgba(229, 231, 235, 0.5)"
      }}
    >
      {children}
    </div>
  );

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
