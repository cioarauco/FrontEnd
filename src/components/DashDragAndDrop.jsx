import React, { useEffect, useState } from 'react';
import { supabase } from '../App';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, title, url }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginBottom: '1rem'
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-white shadow-md rounded p-4">
      <h3 className="font-semibold text-gray-700 mb-2">📌 {title}</h3>
      <iframe src={url} className="w-full h-60 rounded border" allowFullScreen></iframe>
    </div>
  );
}

export default function DashDragAndDrop() {
  const [graficos, setGraficos] = useState([]);

  const fetchGraficos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('dashboards_interactivo')
      .select('*')
      .eq('user_id', user.id)
      .order('orden', { ascending: true });

    if (error) {
      console.error('Error al obtener gráficos:', error.message);
    } else {
      setGraficos(data);
    }
  };

  useEffect(() => {
    fetchGraficos();
  }, []);

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = graficos.findIndex(g => g.id === active.id);
      const newIndex = graficos.findIndex(g => g.id === over?.id);

      const newOrder = arrayMove(graficos, oldIndex, newIndex);
      setGraficos(newOrder);

      // Actualiza el orden en Supabase
      for (let i = 0; i < newOrder.length; i++) {
        await supabase
          .from('dashboards_interactivo')
          .update({ orden: i })
          .eq('id', newOrder[i].id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[url('/bosqueconanimalitos.png')] bg-cover bg-fixed bg-center p-6">
      <div className="max-w-4xl mx-auto bg-white/90 dark:bg-[#1c2e1f]/90 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-[#5E564D] dark:text-white mb-6">📦 Mis Dashboards Interactivos</h1>
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={graficos.map(g => g.id)} strategy={verticalListSortingStrategy}>
            {graficos.map((grafico) => (
              <SortableItem key={grafico.id} id={grafico.id} title={grafico.titulo} url={grafico.url} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
