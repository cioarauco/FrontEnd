// ChartInline.jsx – Ahora soporta gráficos mixtos (mixto = barras + líneas)
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
  BarController,
  LineController
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
  Filler,
  BarController,
  LineController
);

// 🎨 Paleta optimizada para fondo naranja
const COLORS = [
  "#1e40af", // blue-700
  "#059669", // emerald-600
  "#7c3aed", // violet-600
  "#0891b2", // cyan-600
  "#be185d", // pink-700
  "#047857", // emerald-700
  "#4338ca", // indigo-700
];

// Paleta alternativa más suave
const SOFT_COLORS = [
  "#3b82f6",
  "#06b6d4",
  "#8b5cf6",
  "#10b981",
  "#f43f5e",
  "#6366f1",
  "#84cc16",
];

// Utilidad para agregar transparencia a HEX
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
  const isMixedChart = data.chart_type === "mixto";

  // Construcción dinámica de datasets
  let datasets;
  if (isMixedChart) {
    // Cada serie puede tener su propio tipo: 'bar' o 'line'
    datasets = data.values.map((serie, idx) => ({
      label: serie.name,
      type: serie.type, // <- CLAVE: "bar" o "line"
      data: serie.data,
      borderColor: selectedColors[idx % selectedColors.length],
      backgroundColor:
        serie.type === "bar"
          ? withAlpha(selectedColors[idx % selectedColors.length], 0.4)
          : withAlpha(selectedColors[idx % selectedColors.length], 0.2),
      pointBackgroundColor: selectedColors[idx % selectedColors.length],
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      fill: false,
      tension: 0.4,
      borderWidth: 3,
      order: serie.type === "line" ? 1 : 2,
    }));
  } else if (isMultiSeries) {
    datasets = data.values.map((serie, idx) => ({
      label: serie.name || serie.label,
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
    }));
  } else {
    datasets = [
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
  }

  const chartData = {
    labels: data.labels,
    datasets,
  };

  // Opciones generales (mejor contraste fondo naranja)
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
      },
      title: {
        display: !!data.title,
        text: data.title,
        color: "#111827",
        font: { size: 18, weight: "700" },
        padding: { bottom: 20 },
      },
    },
    scales: {
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
  };

  // Wrapper visual para el gráfico
  const Wrapper = ({ children }) => (
    <div
      style={{
        height: "400px",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: "12px",
        padding: "16px",
        boxShadow:
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        border: "1px solid rgba(229, 231, 235, 0.5)",
      }}
    >
      {children}
    </div>
  );

  switch (data.chart_type) {
    case "mixto":
      return (
        <Wrapper>
          <Bar data={chartData} options={options} />
        </Wrapper>
      );
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
