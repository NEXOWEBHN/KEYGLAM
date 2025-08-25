'use client';

import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Wallet, Bot } from 'lucide-react';

// Componente para un ícono animado individual
const AnimatedIcon = ({ icon: Icon, styles }: { icon: React.ElementType, styles: React.CSSProperties }) => (
  <li style={styles}>
    <Icon className="w-full h-full" strokeWidth={1} />
  </li>
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (error) {
      setError('Credenciales inválidas. Por favor, inténtalo de nuevo.');
      console.error("Error de autenticación:", error);
    } finally {
      setLoading(false);
    }
  };

  // Definición de las formas animadas
  const animatedShapes = [
    { icon: Wallet, styles: { left: '25%', width: '80px', height: '80px', animationDelay: '0s' } },
    { icon: Bot, styles: { left: '10%', width: '30px', height: '30px', animationDelay: '2s', animationDuration: '12s' } },
    { icon: Wallet, styles: { left: '70%', width: '25px', height: '25px', animationDelay: '4s' } },
    { icon: Bot, styles: { left: '40%', width: '60px', height: '60px', animationDelay: '0s', animationDuration: '18s' } },
    { icon: Wallet, styles: { left: '65%', width: '20px', height: '20px', animationDelay: '0s' } },
    { icon: Bot, styles: { left: '75%', width: '110px', height: '110px', animationDelay: '3s' } },
    { icon: Wallet, styles: { left: '35%', width: '150px', height: '150px', animationDelay: '7s' } },
    { icon: Bot, styles: { left: '50%', width: '30px', height: '30px', animationDelay: '15s', animationDuration: '45s' } },
    { icon: Wallet, styles: { left: '20%', width: '15px', height: '15px', animationDelay: '2s', animationDuration: '35s' } },
    { icon: Bot, styles: { left: '85%', width: '120px', height: '120px', animationDelay: '0s', animationDuration: '11s' } },
  ];

  return (
    <>
      <style jsx global>{`
        .background-shapes {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 0;
        }

        .background-shapes li {
          position: absolute;
          display: block;
          list-style: none;
          color: rgba(252, 211, 241, 0.6); /* pink-200 with opacity */
          animation: animateShapes 25s linear infinite;
          bottom: -200px; /* Empezar más abajo para que no aparezcan de golpe */
        }

        @keyframes animateShapes {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(-120vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
      <div className="relative flex items-center justify-center min-h-screen bg-rose-50 text-gray-800 overflow-hidden">
        <ul className="background-shapes">
          {animatedShapes.map((shape, index) => (
            <AnimatedIcon key={index} icon={shape.icon} styles={shape.styles as React.CSSProperties} />
          ))}
        </ul>

        <main className="relative z-10 w-full max-w-6xl mx-auto grid md:grid-cols-2 items-center p-4">
          
          <div className="hidden md:block px-12">
            <h1 className="text-6xl font-bold tracking-wider text-gray-800">KeyGlam</h1>
            <p className="mt-4 text-xl text-gray-500">Donde la belleza se encuentra con la eficiencia. Gestiona, vende y crece.</p>
          </div>

          <div className="w-full max-w-md mx-auto p-8 md:p-10 space-y-8 bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30">
            <div className="text-center">
              <h2 className="text-3xl font-semibold text-gray-800">Bienvenida de Nuevo</h2>
              <p className="mt-2 text-gray-500">Inicia sesión para continuar</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-8">
              <div className="relative group">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-transparent border-b-2 border-gray-300 text-gray-800 placeholder-transparent focus:outline-none focus:border-pink-400 transition-colors peer"
                  placeholder="Correo Electrónico"
                />
                <label 
                  htmlFor="email" 
                  className="absolute left-4 -top-3.5 text-gray-500 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-3.5 peer-focus:text-pink-500 peer-focus:text-sm"
                >
                  <Mail className="inline-block mr-2 -mt-1" size={16} />
                  Correo Electrónico
                </label>
              </div>
              
              <div className="relative group">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-transparent border-b-2 border-gray-300 text-gray-800 placeholder-transparent focus:outline-none focus:border-pink-400 transition-colors peer"
                  placeholder="Contraseña"
                />
                <label 
                  htmlFor="password" 
                  className="absolute left-4 -top-3.5 text-gray-500 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3.5 peer-focus:-top-3.5 peer-focus:text-pink-500 peer-focus:text-sm"
                >
                  <Lock className="inline-block mr-2 -mt-1" size={16} />
                  Contraseña
                </label>
              </div>

              {error && <p className="text-sm text-red-600 text-center pt-2">{error}</p>}
              
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full group flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-lg font-medium text-white bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all transform hover:scale-105 disabled:bg-gray-400 disabled:scale-100"
                >
                  {loading ? 'Verificando...' : 'Ingresar'}
                  {!loading && <ArrowRight className="ml-2 -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all" size={22} />}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
