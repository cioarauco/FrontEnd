import React from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Title
);

export default function ChartInline({ data }) {
  if (!data || !data.labels || !data.values || !data.chart_type) return null;

  const config = {
    labels: data.labels,
    datasets: Array.isArray(data.values[0])
      ? data.values.map((serie, i) => ({
          label: serie.label || `Serie ${i + 1}`,
          data: serie.data || [],
          borderWidth: 2,
          fill: false
        }))
      : [
          {
            label: data.title,
            data: data.values,
            backgroundColor: '#D2C900',
            borderColor: '#5E564D',
            borderWidth: 1
          }
        ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: data.title || '' }
    }
  };

  const chartType = data.chart_type;

  return (
    <div className="my-4">
      {chartType === 'bar' && <Bar data={config} options={options} />}
      {chartType === 'line' && <Line data={config} options={options} />}
    </div>
  );
}
