import React, { useState, useEffect } from 'react';
import { supabase } from '../App';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Oculta cualquier header si lo controlas con una clase o ID global
    const header = document.getElementById('global-header');
    if (header) header.style.display = 'none';

    return () => {
      if (header) header.style.display = ''; // lo restaura al salir
    };
  }, []);

  const handleRegister = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert('Error en registro: ' + error.message);
    } else {
      alert('Registro exitoso! Revisa tu email para confirmar.');
    }
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert('Error en login: ' + error.message);
    } else {
      navigate('/chat');
    }
  };

  return (
    <div className="min-h-screen bg-[url('/camioncito.png')] bg-cover bg-fixed bg-center p-6 flex items-center justify-center">
      <div className="bg-white/90 dark:bg-[#1c2e1f]/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-8 w-full max-w-sm space-y-5">
        
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-2xl">🌲</span>
          <h1 className="text-xl font-bold font-serif text-[#5E564D] dark:text-white">Tronix Forest Assistant</h1>
        </div>

        <h2 className="text-lg font-semibold text-[#5E564D] dark:text-white">🔐 Login / Registro</h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D2C900] text-sm dark:bg-[#2e2b26] dark:text-white dark:border-gray-600"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Contraseña"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D2C900] text-sm dark:bg-[#2e2b26] dark:text-white dark:border-gray-600"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full bg-[#4CAF50] hover:bg-[#449944] text-white font-semibold py-2 rounded-lg shadow"
        >
          Iniciar Sesión
        </button>

        <button
          onClick={handleRegister}
          className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold py-2 rounded-lg shadow"
        >
          Registrarse
        </button>
      </div>
    </div>
  );
}

