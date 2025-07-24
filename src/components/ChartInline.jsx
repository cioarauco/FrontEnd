// ChartInline.jsx
import React from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
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
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Legend,
  Tooltip
);

export default function ChartInline({ data }) {
  if (!data || !data.labels || !data.values) return null;

  const isMultiSeries = Array.isArray(data.values) && typeof data.values[0] === 'object';

  const datasets = isMultiSeries
    ? data.values.map(serie => ({
        label: serie.name,
        data: serie.data,
        fill: false,
        borderWidth: 2,
        tension: 0.2,
      }))
    : [
        {
          label: data.title || 'Serie',
          data: data.values,
          fill: false,
          borderWidth: 2,
          tension: 0.2,
        },
      ];

  const chartData = {
    labels: data.labels,
    datasets,
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: !!data.title,
        text: data.title,
      },
    },
  };

  switch (data.chart_type) {
    case 'bar':
      return <Bar data={chartData} options={options} />;
    case 'pie':
      return <Pie data={chartData} options={options} />;
    case 'multi-line':
    case 'line':
    default:
      return <Line data={chartData} options={options} />;
  }
}
