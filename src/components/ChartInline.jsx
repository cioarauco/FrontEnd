// ChartInline.jsx – versión con mejoras estéticas
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
  Filler // permite rellenos bajo la línea
);

// 🎨 Paleta base (tailwind‑like)
const COLORS = [
  "#2563eb", // blue‑600
  "#10b981", // emerald‑500
  "#f59e0b", // amber‑500
  "#ef4444", // red‑500
  "#8b5cf6", // violet‑500
  "#14b8a6", // teal‑500
  "#f43f5e", // rose‑500
];

// Utilidad para agregar transparencia a un color HEX
const withAlpha = (hex, alpha) => {
  const [r, g, b] = hex
    .replace("#", "")
    .match(/.{1,2}/g)
    .map((x) => parseInt(x, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function ChartInline({ data }) {
  if (!data || !data.labels || !data.values) return null;

  const isMultiSeries =
    Array.isArray(data.values) && typeof data.values[0] === "object";

  // 🗂️ Construcción dinámica de datasets con colores agradables
  const datasets = isMultiSeries
    ? data.values.map((serie, idx) => ({
        label: serie.name,
        data: serie.data,
        borderColor: COLORS[idx % COLORS.length],
        backgroundColor:
          data.chart_type === "bar"
            ? withAlpha(COLORS[idx % COLORS.length], 0.35)
            : withAlpha(COLORS[idx % COLORS.length], 0.15),
        pointBackgroundColor: COLORS[idx % COLORS.length],
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: data.chart_type === "multi-line", // área bajo la curva sólo para multi‑line
        tension: 0.3,
        borderWidth: 2,
      }))
    : [
        {
          label: data.title || "Serie",
          data: data.values,
          borderColor: COLORS[0],
          backgroundColor:
            data.chart_type === "bar"
              ? withAlpha(COLORS[0], 0.35)
              : withAlpha(COLORS[0], 0.15),
          pointBackgroundColor: COLORS[0],
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: data.chart_type === "line",
          tension: 0.3,
          borderWidth: 2,
        },
      ];

  const chartData = {
    labels: data.labels,
    datasets,
  };

  // ⚙️ Ajustes visuales comunes
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 12 },
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#374151", // slate‑700
          boxWidth: 16,
        },
      },
      tooltip: {
        backgroundColor: "#1f2937ee", // gray‑800 con transparencia
        titleFont: { size: 14, weight: "600" },
        bodyFont: { size: 13 },
        borderColor: "#111827", // gray‑900
        borderWidth: 1,
        cornerRadius: 4,
        padding: 10,
      },
      title: {
        display: !!data.title,
        text: data.title,
        color: "#111827", // gray‑900
        font: { size: 16, weight: "600" },
        padding: { bottom: 14 },
      },
    },
    scales: {
      x: {
        grid: {
          color: withAlpha("#e5e7eb", 0.5), // gray‑200 50%
        },
        ticks: {
          color: "#6b7280", // gray‑500
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
        },
      },
      y: {
        grid: {
          color: withAlpha("#e5e7eb", 0.5),
        },
        ticks: {
          color: "#6b7280",
          beginAtZero: true,
        },
      },
    },
  };

  // ⬇️ Render según tipo
  const Wrapper = ({ children }) => (
    <div style={{ height: "380px" }}>{children}</div>
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
