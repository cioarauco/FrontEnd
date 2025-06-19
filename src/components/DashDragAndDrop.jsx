
import React, { useEffect, useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { supabase } from '../App';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashDragAndDrop() {
  const [layouts, setLayouts] = useState([]);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserAndData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase
        .from('dashboards_drag')
        .select('*')
        .eq('user_id', user.id);

      if (data) {
        const layoutData = data.map((item, index) => ({
          i: item.id,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          title: item.titulo,
          url: item.url
        }));
        setLayouts(layoutData);
      }
    };

    fetchUserAndData();
  }, []);

  const handleLayoutChange = async (currentLayout) => {
    setLayouts(prev =>
      prev.map(item => {
        const updated = currentLayout.find(l => l.i === item.i);
        return updated ? { ...item, ...updated } : item;
      })
    );

    for (const l of currentLayout) {
      await supabase.from('dashboards_drag').update({
        x: l.x,
        y: l.y,
        w: l.w,
        h: l.h
      }).eq('id', l.i).eq('user_id', userId);
    }
  };

  return (
    <div className="min-h-screen bg-[url('/fondo-forestal-pro.jpg')] bg-cover bg-fixed bg-center p-4">
      <div className="max-w-7xl mx-auto bg-white/80 dark:bg-[#1c2e1f]/80 rounded-xl p-6 shadow-lg border dark:border-gray-700">
        <h1 className="text-2xl font-bold text-[#5E564D] dark:text-white mb-4">📦 Dashboard Interactivo</h1>
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layouts }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 2 }}
          rowHeight={40}
          onLayoutChange={handleLayoutChange}
          isResizable
          isDraggable
        >
          {layouts.map(item => (
            <div key={item.i} className="bg-white border rounded-lg p-2 shadow">
              <h2 className="text-sm font-bold text-gray-800 mb-1">{item.title}</h2>
              <iframe src={item.url} className="w-full h-full rounded border" allowFullScreen />
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}
