import React, { useEffect, useState } from 'react';
import { supabase } from '../App';
import {
  DragDropContext,
  Droppable,
  Draggable
} from '@hello-pangea/dnd';

export default function DashDragAndDrop() {
  const [items, setItems] = useState([]);

  /* carga dashboards_interactivo */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('dashboards_interactivo')
        .select('*')
        .eq('user_id', user.id)
        .order('orden', { ascending: true });
      setItems(data);
    })();
  }, []);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const reordered = Array.from(items);
    const [moved]  = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setItems(reordered);

    /* persiste nuevo orden */
    for (let i = 0; i < reordered.length; i++) {
      await supabase
        .from('dashboards_interactivo')
        .update({ orden: i })
        .eq('id', reordered[i].id);
    }
  };

  return (
    <div className="min-h-screen bg-[url('/bosqueconanimalitos.png')] bg-cover bg-fixed bg-center p-6">
      <div className="max-w-4xl mx-auto bg-white/90 dark:bg-[#1c2e1f]/90 p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-[#5E564D] dark:text-white mb-6">
          🧩 Dash Interactivo (drag & drop)
        </h1>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="lista">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {items.map((it, idx) => (
                  <Draggable key={it.id} draggableId={it.id} index={idx}>
                    {(prov) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        className="mb-4 bg-white rounded shadow p-3"
                      >
                        <h3 className="font-semibold text-sm mb-2">
                          {it.titulo}
                        </h3>
                        <iframe
                          src={it.url}
                          className="w-full h-60 border rounded"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}
