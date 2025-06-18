import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { supabase } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserCircle, FaTree, FaTrashAlt } from 'react-icons/fa';

const WEBHOOK_URL = 'https://n8n-production-993e.up.railway.app/webhook/01103618-3424-4455-bde6-aa8d295157b2';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [frequentQuestions, setFrequentQuestions] = useState([]);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchFrequentQuestions = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn("No se pudo obtener el usuario:", userError);
      return;
    }

    const { data, error } = await supabase
      .from('preguntas_frecuentes')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error("❌ Error al consultar preguntas frecuentes:", error.message);
    } else {
      setFrequentQuestions(data);
    }
  };

  useEffect(() => {
    fetchFrequentQuestions();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newUserMessage = { role: 'user', content: input, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, newUserMessage]);
    setLoading(true);

    try {
      const res = await axios.post(WEBHOOK_URL, { message: input });
      const raw = res.data.response || res.data;
      const parsed = Array.isArray(raw) && raw[0]?.output ? raw[0].output : raw;
      const agentReply = { role: 'agent', content: parsed, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, agentReply]);
    } catch (error) {
      const errorReply = { role: 'agent', content: '⚠️ Error al contactar con el agente.', timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, errorReply]);
    }

    setInput('');
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const extractIframe = (text) => {
    const match = text.match(/!\[.*?\]\((https?:\/\/[^\s)]+\?grafico_id=[^\s)]+)\)/);
    if (match) {
      const url = match[1];
      const cleanedText = text.replace(match[0], '').trim();
      return { url, cleanedText };
    }
    return null;
  };

  const handleEliminarPregunta = async (id) => {
    const confirmacion = confirm("¿Eliminar esta pregunta de tus favoritos?");
    if (!confirmacion) return;

    const { error } = await supabase.from('preguntas_frecuentes').delete().eq('id', id);
    if (error) {
      alert("❌ Error al eliminar: " + error.message);
    } else {
      fetchFrequentQuestions();
    }
  };

  const renderMessage = (msg, index) => {
    const isUser = msg.role === 'user';
    const baseStyle = isUser
      ? 'bg-[#D2C900] text-black rounded-l-3xl rounded-br-3xl'
      : 'bg-[#DFA258] text-black dark:text-white rounded-r-3xl rounded-bl-3xl';
    const icon = isUser ? <FaUserCircle className="text-xl" /> : <FaTree className="text-xl text-[#5E564D]" />;
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const iframeMatch = typeof msg.content === 'string' ? extractIframe(msg.content) : null;

    const handleGuardarPregunta = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        alert('Debes iniciar sesión para guardar la pregunta.');
        return;
      }
      const { error } = await supabase.from('preguntas_frecuentes').insert({
        user_id: user.id,
        pregunta: msg.content,
        fecha_creacion: new Date(),
      });
      if (error) {
        alert('❌ Error al guardar: ' + error.message);
      } else {
        alert('✅ Pregunta guardada como favorita');
        fetchFrequentQuestions();
      }
    };

    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`w-full max-w-2xl p-4 shadow-lg ${baseStyle}`}>
          <div className="flex items-center gap-2 mb-1">
            {icon}
            <span className="font-semibold">{isUser ? 'Tú' : 'Tronix'}</span>
          </div>

          {iframeMatch ? (
            <>
              <div className="text-sm mt-2" dangerouslySetInnerHTML={{ __html: iframeMatch.cleanedText.replace(/\n/g, '<br/>') }} />
              <iframe src={iframeMatch.url} className="w-full mt-3 rounded-lg border" style={{ height: '400px' }} allowFullScreen />
            </>
          ) : (
            <div className="text-sm mt-2">
              {typeof msg.content === 'string' ? (
                <div className="prose max-w-full" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
              ) : typeof msg.content === 'object' ? (
                <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-xs">{JSON.stringify(msg.content, null, 2)}</pre>
              ) : (
                msg.content
              )}
            </div>
          )}

          {isUser && (
            <button
              onClick={handleGuardarPregunta}
              className="mt-3 bg-[#D2C900] hover:bg-[#bcae00] text-black px-3 py-1 rounded text-xs shadow"
            >
              💾 Guardar como favorita
            </button>
          )}

          <div className="text-xs text-right mt-2 text-gray-600 dark:text-gray-300">{time}</div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[url('/fondo-forestal-pro.jpg')] bg-cover bg-fixed bg-center p-6">
      <div className="flex justify-between items-center bg-white/90 dark:bg-[#1c2e1f]/90 px-6 py-3 rounded-xl shadow mb-6 max-w-4xl mx-auto border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <FaTree className="text-2xl text-[#D2C900]" />
          <span className="text-xl font-serif font-bold text-[#5E564D] dark:text-white">Tronix Forest Assistant</span>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <a href="/chat" className="text-[#5E564D] dark:text-white hover:underline">🌲 Chat Tronix</a>
          <a href="/dashboards" className="text-[#5E564D] dark:text-white hover:underline">📊 Mis Dashboards</a>
          <a href="/panel-ejecutivo" className="text-[#5E564D] dark:text-white hover:underline">📈 Panel Ejecutivo</a>
          <a href="/" onClick={() => supabase.auth.signOut()} className="text-[#5E564D] dark:text-red-400 hover:underline">🚪 Cerrar sesión</a>
        </div>
      </div>

      <div className="bg-white/90 dark:bg-[#1c2e1f]/90 p-6 rounded-xl shadow-lg max-w-4xl mx-auto border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-white mb-2">📌 Tus preguntas frecuentes:</h3>
          {frequentQuestions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {frequentQuestions.map((q, i) => (
                <div key={i} className="flex items-center bg-[#FDF3BF] text-[#5E564D] px-3 py-1 rounded text-xs font-medium">
                  <button
                    onClick={() => setInput(q.pregunta)}
                    className="hover:underline mr-2"
                  >
                    {q.pregunta}
                  </button>
                  <button onClick={() => handleEliminarPregunta(q.id)} className="text-red-500 hover:text-red-700 ml-1">
                    <FaTrashAlt className="text-xs" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">No tienes preguntas guardadas todavía.</p>
          )}
        </div>

        <div className="space-y-4 mb-4">
          <AnimatePresence>{messages.map(renderMessage)}</AnimatePresence>
          {loading && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">Tronix está pensando...</div>
          )}
          <div ref={chatEndRef} />
        </div>

        <textarea
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#D2C900] dark:focus:ring-[#E5D9AB] focus:outline-none transition-all text-sm dark:bg-[#2e2b26] dark:text-white"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu mensaje... (Shift+Enter para salto de línea)"
          rows={3}
        />
        <button
          onClick={handleSend}
          className="bg-[#D2C900] hover:bg-[#bcae00] text-black font-semibold px-5 py-2 rounded-lg shadow mt-2 w-full"
        >
          📨 Enviar
        </button>
      </div>
    </div>
  );
}
