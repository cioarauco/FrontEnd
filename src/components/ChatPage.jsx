import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { supabase } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserCircle, FaTree } from 'react-icons/fa';

const WEBHOOK_URL = 'https://n8n-production-993e.up.railway.app/webhook/01103618-3424-4455-bde6-aa8d295157b2';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await supabase.from('prompts_favoritos').insert({ user_id: user.id, prompt: input, fecha: new Date() });
      }
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

  const saveGraph = async (url) => {
    const titulo = prompt('Ingresa un título para este gráfico:');
    if (!titulo) return;

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      alert('Debe iniciar sesión primero.');
      return;
    }

    const { error } = await supabase
      .from('dashboards')
      .insert({ user_id: user.id, titulo, url, fecha: new Date() });

    if (error) {
      alert('Error al guardar gráfico: ' + error.message);
    } else {
      alert('Gráfico guardado correctamente.');
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

  const renderMessage = (msg, index) => {
    const isUser = msg.role === 'user';
    const baseStyle = isUser
      ? 'bg-[#D2C900] text-black rounded-l-3xl rounded-br-3xl'
      : 'bg-[#DFA258] text-black dark:text-white rounded-r-3xl rounded-bl-3xl';
    const icon = isUser ? <FaUserCircle className="text-xl" /> : <FaTree className="text-xl text-[#5E564D]" />;
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    // Handle iframe/grafico
    if (typeof msg.content === 'string') {
      const iframeMatch = extractIframe(msg.content);
      if (iframeMatch) {
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-md p-4 shadow-lg ${baseStyle}`}>
              <div className="flex items-center gap-2">{icon}<span className="font-semibold">{isUser ? 'Tú' : 'Tronix'}</span></div>
              <div
                className="text-sm mt-2 overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: iframeMatch.cleanedText.replace(/\n/g, '<br/>') }}
              />
              <iframe
                src={iframeMatch.url}
                className="w-full mt-3 rounded-lg border"
                style={{ height: '400px' }}
                allowFullScreen
              />
              <button
                onClick={() => saveGraph(iframeMatch.url)}
                className="mt-3 bg-[#D2C900] hover:bg-[#bcae00] text-black px-4 py-2 rounded-lg shadow"
              >
                Guardar gráfico
              </button>
              <div className="text-xs text-right mt-2 text-gray-600 dark:text-gray-300">{time}</div>
            </div>
          </motion.div>
        );
      }
    }

    const isLink = typeof msg.content === 'string' && msg.content.startsWith('http');
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`max-w-md p-4 shadow-lg ${baseStyle}`}>
          <div className="flex items-center gap-2">{icon}<span className="font-semibold">{isUser ? 'Tú' : 'Tronix'}</span></div>
          <div className="text-sm mt-2 overflow-x-auto">
            {isLink ? (
              <a href={msg.content} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
                {msg.content}
              </a>
            ) : typeof msg.content === 'object' ? (
              <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-xs whitespace-pre-wrap">
                {JSON.stringify(msg.content, null, 2)}
              </pre>
            ) : (
              <div
                className="prose max-w-full"
                dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }}
              />
            )}
          </div>
          <div className="text-xs text-right mt-2 text-gray-600 dark:text-gray-300">{time}</div>
        </div>
      </motion.div>
    );
  };

  const quickPrompts = [
    '¿Cuánto stock hay en predios del Maule?',
    'Hazme un gráfico de producción de eucaliptus',
    'Comparación de despachos de PIRA vs PIOR',
    'Proyecciones de stock en zona Valdivia'
  ];

  return (
    <div className="min-h-screen bg-[url('/fondo-forestal-pro.jpg')] bg-cover bg-fixed bg-center p-6">
      <div className="flex items-center justify-center mb-6">
        <FaTree className="text-3xl text-[#D2C900] mr-2" />
        <h1 className="text-3xl font-bold text-[#5E564D] dark:text-white font-serif">Tronix Forest Assistant</h1>
      </div>

      <div className="bg-white/90 dark:bg-[#1c2e1f]/90 p-6 rounded-xl shadow-lg max-w-4xl mx-auto border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => setInput
