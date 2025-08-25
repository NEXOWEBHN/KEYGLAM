'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Home, Package, ShoppingCart, Users, FileText, Calendar, LogOut } from 'lucide-react';
import { auth } from '../app/lib/firebase';
import { signOut } from 'firebase/auth';

interface SidebarProps {
  activeMenu: string;
}

export default function Sidebar({ activeMenu }: SidebarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const menuItems = [
    { name: 'Dashboard', icon: Home, href: '/' },
    { name: 'Ventas', icon: ShoppingCart, href: '/ventas' },
    { name: 'Inventario', icon: Package, href: '/inventario' },
    { name: 'Clientes', icon: Users, href: '/clientes' },
    { name: 'Deudas', icon: FileText, href: '/deudas' },
    { name: 'Reportes', icon: Calendar, href: '/reportes' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-pink-500 tracking-wider">KeyGlam</h1>
      </div>
      <nav className="flex-1 px-4 py-2">
        {menuItems.map(item => (
          <a
            key={item.name}
            href={item.href}
            className={`flex items-center px-4 py-3 my-1 rounded-lg transition-colors duration-200 ${
              activeMenu === item.name
                ? 'bg-pink-500 text-white shadow-md'
                : 'text-gray-600 hover:bg-pink-50 hover:text-pink-600'
            }`}
          >
            <item.icon size={20} className="mr-3" />
            <span className="font-medium">{item.name}</span>
          </a>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="mb-4">
            <p className="font-semibold text-sm text-gray-800">Keylin</p>
            <p className="text-xs text-gray-500">Administrador</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center px-4 py-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors duration-200"
        >
          <LogOut size={16} className="mr-2" />
          <span className="font-medium text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
