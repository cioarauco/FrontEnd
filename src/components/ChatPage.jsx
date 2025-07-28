import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { supabase } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUserCircle, FaTree, FaTrashAlt } from 'react-icons/fa';
import ChartFromSQL from '../components/ChartFromSQL';
import ChartInline from '../components/ChartInline';

// 🌐 ENDPOINT DEL AGENTE
const WEBHOOK_URL =
  'https://n8n-production-993e.up.railway.app/webhook/01103618-3424-4455-bde6-aa8d295157b2';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [frequentQuestions, setFrequentQuestions] = useState([]);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /* --------------------------------------------------
   *  🔄  INIT – SESSION ID & PREGUNTAS FRECUENTES
   * -------------------------------------------------- */
  useEffect(() => {
    if (!sessionStorage.getItem('sessionId')) {
      sessionStorage.setItem('sessionId', crypto.randomUUID());
    }
  }, []);

  useEffect(scrollToBottom, [messages]);

  const fetchFrequentQuestions = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('preguntas_frecuentes')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha_creacion', { ascending: false });

    if (!error) setFrequentQuestions(data);
  };

  useEffect(fetchFrequentQuestions, []);

  /* --------------------------------------------------
   *  📤  ENVIAR MENSAJE AL AGENTE
   * -------------------------------------------------- */
  const handleSend = async () => {
    if (!input.trim()) return;

    const newUserMsg = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMsg]);
    setLoading(true);

    try {
      const { data: raw } = await axios.post(WEBHOOK_URL, {
        message: input,
        sessionId: sessionStorage.getItem('sessionId'),
      });

      // 🔍 Algunos n8n workflows devuelven { response: ... }
      const agentRaw = raw.response ?? raw;

      let parsed = agentRaw;

      // Si viene como array con .output (OpenAI tools) → tomar .output
      if (Array.isArray(agentRaw) && agentRaw[0]?.output) {
        parsed = agentRaw[0].output;
      }

      const agentMsg = {
        role: 'agent',
        content: parsed,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      const errorMsg = {
        role: 'agent',
        content: `⚠️ Error al contactar con el agente: ${err.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
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

  /* --------------------------------------------------
   *  🖼️  PARSE & RENDER DE CADA MENSAJE
   * -------------------------------------------------- */
  const extractIframe = (text) => {
    const m = text.match(
      /!\[.*?\]\((https?:\/\/[^\s)]+\?grafico_id=([a-zA-Z0-9-]+))\)/,
    );
    return m
      ? { url: m[1], grafico_id: m[2], cleanedText: text.replace(m[0], '').trim() }
      : null;
  };

  const renderMessage = (msg, idx) => {
    // 1️⃣ Normalizamos el contenido → parsedContent
    let parsedContent = msg.content;

    // 1.a) Si viene como string, ¿contiene JSON embebido?
    if (typeof parsedContent === 'string') {
      const match = parsedContent.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsedContent = JSON.parse(match[0]);
        } catch (_) {/* ignora si no es JSON válido */}
      }
    }

    // 1.b) Si viene como objeto anidado (response_0.chart_payload)
    if (
      parsedContent?.response_0?.chart_payload?.labels &&
      parsedContent.response_0.chart_payload.labels.length
    ) {
      parsedContent = parsedContent.response_0.chart_payload;
    }

    /* --------------------------------------------------
     *  🎨  DECIDIR QUÉ COMPONENTE USAR
     * -------------------------------------------------- */
    const asIframe =
      typeof parsedContent === 'string' ? extractIframe(parsedContent) : null;

    const isChartPayload =
      parsedContent &&
      typeof parsedContent === 'object' &&
      parsedContent.labels &&
      parsedContent.values;

    /* --------------------------------------------------
     *  🖌️  ESTILOS & METADATOS COMUNES
     * -------------------------------------------------- */
    const isUser = msg.role === 'user';
    const wrapperCls = isUser
      ? 'bg-[#D2C900] text-black rounded-l-3xl rounded-br-3xl'
      : 'bg-[#DFA258] text-black dark:text-white rounded-r-3xl rounded-bl-3xl';
    const icon = isUser ? (
      <FaUserCircle className="text-xl" />
    ) : (
      <FaTree className="text-xl text-[#5E564D]" />
    );

    /* --------------------------------------------------
     *  📦  RENDER
     * -------------------------------------------------- */
    return (
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`w-full max-w-2xl p-4 shadow-lg ${wrapperCls}`}>
          <div className="flex items-center gap-2 mb-1">
            {icon}
            <span className="font-semibold">{isUser ? 'Tú' : 'Tronix'}</span>
          </div>

          {/* ----- 📈 Chart INLINE / Iframe / Texto ----- */}
          {asIframe ? (
            <>
              <div
                className="text-sm mt-2"
                dangerouslySetInnerHTML={{
                  __html: asIframe.cleanedText.replace(/\n/g, '<br/>'),
                }}
              />
              <ChartFromSQL grafico_id={asIframe.grafico_id} />
            </>
          ) : isChartPayload ? (
            <>
              {/* Explicación textual */}
              {parsedContent.respuesta && (
                <div className="text-sm mt-2">{parsedContent.respuesta}</div>
              )}
              {/* Gráfico inline */}
              <ChartInline data={parsedContent} />
              <button
                onClick={async () => {
                  const { data, error } = await supabase.from('graficos').insert({
                    title: parsedContent.title,
                    chart_type: parsedContent.chart_type,
                    labels: parsedContent.labels,
                    values: parsedContent.values,
                    sql: parsedContent.sql,
                  }).select('id').single();

                  if (error) {
                    alert('Error guardando gráfico: ' + error.message);
                    return;
                  }

                  alert('Gráfico guardado en Supabase.');

                  guardarGraficoEnDashboard(data.id);
               }}
                className="mt-3 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs shadow"  
              >
                💾 Guardar gráfico en mis Dashboards
              </button>
            </>
          ) : (
            <div className="text-sm mt-2">
              {typeof parsedContent === 'string' ? (
                <div
                  className="prose max-w-full"
                  dangerouslySetInnerHTML={{
                    __html: parsedContent.replace(/\n/g, '<br/>'),
                  }}
                />
              ) : (
                <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-xs">
                  {JSON.stringify(parsedContent, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* ----- ⭐ Acciones ----- */}
          {isUser && (
            <button
              onClick={async () => {
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user) return alert('Debes iniciar sesión para guardar.');
                await supabase.from('preguntas_frecuentes').insert({
                  user_id: user.id,
                  pregunta: msg.content,
                  fecha_creacion: new Date(),
                });
                fetchFrequentQuestions();
              }}
              className="mt-3 bg-[#D2C900] hover:bg-[#bcae00] text-black px-3 py-1 rounded text-xs shadow"
            >
              💾 Guardar como favorita
            </button>
          )}

          <div className="text-xs text-right mt-2 text-gray-600 dark:text-gray-300">
            {new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </motion.div>
    );
  };
  async function guardarGraficoEnSupabase(grafico) {
  const { data, error } = await supabase.from('graficos').insert({
    title: grafico.title,
    chart_type: grafico.chart_type,
    labels: grafico.labels,
    values: grafico.values,
    sql: grafico.sql
  });

  if (error) {
    alert('Error guardando gráfico: ' + error.message);
  } else {
    alert('Gráfico guardado correctamente.');
  }
}
  const guardarGraficoEnDashboard = async (graficoId) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert('Debes iniciar sesión para guardar en el dashboard.');
    return;
  }

  const { error } = await supabase.from('dashboard').insert({
    grafico_id: graficoId,
    user_id: user.id,
  });

  if (error) {
    alert('Error guardando en dashboard: ' + error.message);
  } else {
    alert('Gráfico añadido al dashboard correctamente.');
  }
};

  /* --------------------------------------------------
   *  🌳  UI PRINCIPAL
   * -------------------------------------------------- */
  return (
    <div className="min-h-screen bg-[url('/camioncito.png')] bg-cover bg-fixed bg-bottom p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white/90 dark:bg-[#1c2e1f]/90 px-6 py-3 rounded-xl shadow mb-6 max-w-4xl mx-auto border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <FaTree className="text-2xl text-[#D2C900]" />
          <span className="text-xl font-serif font-bold text-[#5E564D] dark:text-white">
            Tronix Forest Assistant
          </span>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <a href="/chat" className="text-[#5E564D] dark:text-white hover:underline">
            🌲 Chat Tronix
          </a>
          <a href="/dashboards" className="text-[#5E564D] dark:text-white hover:underline">
            📊 Mis Dashboards
          </a>
          <a href="/panel-ejecutivo" className="text-[#5E564D] dark:text-white hover:underline">
            📈 Panel Ejecutivo
          </a>
          <a
            href="/"
            onClick={() => supabase.auth.signOut()}
            className="text-[#5E564D] dark:text-red-400 hover:underline"
          >
            🚪 Cerrar sesión
          </a>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="bg-white/90 dark:bg-[#1c2e1f]/90 p-6 rounded-xl shadow-lg max-w-4xl mx-auto border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        {/* Preguntas frecuentes */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-white mb-2">
            📌 Tus preguntas frecuentes:
          </h3>
          {frequentQuestions.length ? (
            <div className="flex flex-wrap gap-2">
              {frequentQuestions.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center bg-[#FDF3BF] text-[#5E564D] px-3 py-1 rounded text-xs font-medium"
                >
                  <button
                    onClick={() => setInput(q.pregunta)}
                    className="hover:underline mr-2"
                  >
                    {q.pregunta}
                  </button>
                  <button
                    onClick={() =>
                      supabase
                        .from('preguntas_frecuentes')
                        .delete()
                        .eq('id', q.id)
                        .then(fetchFrequentQuestions)
                    }
                    className="text-red-500 hover:text-red-700 ml-1"
                  >
                    <FaTrashAlt className="text-xs" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No tienes preguntas guardadas todavía.
            </p>
          )}
        </div>

        {/* Chat */}
        <div className="space-y-4 mb-4">
          <AnimatePresence>{messages.map(renderMessage)}</AnimatePresence>
          {loading && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Tronix está pensando...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
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
