import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import ChatPage from '@/components/ChatPage';
import DashboardPage from '@/components/DashboardPage';
import Login from '@/components/Login';
import PanelEjecutivo from '@/components/PanelEjecutivo';
import DashDragAndDrop from '@/components/DashDragAndDrop'; // 🧩 NUEVO DASH

export const supabase = createClient(
  "https://kvenozirujsvjrsmpqhu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZW5vemlydWpzdmpyc21wcWh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTM1NDM0MiwiZXhwIjoyMDYwOTMwMzQyfQ.PHyDwgHefWFTQkNKPRZ-Xdj7v6cg6j9oZ3VWTbseKLc"
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/dashboards" element={<DashboardPage />} />
        <Route path="/panel-ejecutivo" element={<PanelEjecutivo />} />
        <Route path="/dashboards-drag" element={<DashDragAndDrop />} /> {/* 🧩 NUEVA RUTA */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
