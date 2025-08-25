'use client';

import React, { useState, useEffect } from 'react';
import { Home, Package, ShoppingCart, Users, DollarSign,X } from 'lucide-react';
import { db } from './lib/firebase';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import Sidebar from '../components/Sidebar'

// --- TIPOS DE DATOS ---
interface Sale {
  id: string;
  clientName: string;
  total: number;
  status: 'Pagado' | 'Pendiente';
  createdAt: Timestamp; 
  items: { productName: string; quantity: number }[];
}

interface Product {
  id: string;
  name: string;
  stock: number;
}

interface Client {
  id: string;
  createdAt: Timestamp; 
}

interface TopProduct {
  name: string;
  sold: number;
}

interface Stats {
  salesToday: number;
  newClients: number;
  lowStockCount: number;
  monthlySales: number;
}

// --- COMPONENTES DE UI ---
const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300 h-full">
    <div className="flex justify-between items-start">
      <div className="flex flex-col">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-full bg-pink-50`}>
        <Icon className={color} size={24} />
      </div>
    </div>
  </div>
);

const RecentSalesTable = ({ sales }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-lg text-gray-800 mb-4">Ventas Recientes</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-gray-200 text-sm text-gray-500">
                        <th className="py-3 px-4 font-medium">Cliente</th>
                        <th className="py-3 px-4 font-medium">Fecha</th>
                        <th className="py-3 px-4 font-medium">Total</th>
                        <th className="py-3 px-4 font-medium">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {sales.map(sale => (
                        <tr key={sale.id} className="border-b border-gray-100 hover:bg-pink-50/50">
                            <td className="py-4 px-4 text-sm text-gray-700">{sale.clientName}</td>
                            <td className="py-4 px-4 text-sm text-gray-500">{sale.createdAt.toDate().toLocaleDateString()}</td>
                            <td className="py-4 px-4 text-sm font-bold text-gray-800">${sale.total.toFixed(2)}</td>
                            <td className="py-4 px-4 text-sm">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    sale.status === 'Pagado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                    {sale.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                     {sales.length === 0 && (
                        <tr>
                            <td colSpan={4} className="text-center py-10 text-gray-500">No hay ventas recientes.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

const TopProductsList = ({ products }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-lg text-gray-800 mb-4">Productos Más Vendidos (este mes)</h3>
        <ul className="space-y-4">
            {products.map((product, index) => (
                <li key={index} className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-gray-700">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.sold} unidades vendidas</p>
                    </div>
                    <div className="text-lg font-bold text-pink-500">
                        #{index + 1}
                    </div>
                </li>
            ))}
             {products.length === 0 && <p className="text-sm text-gray-500 text-center">No hay ventas registradas este mes.</p>}
        </ul>
    </div>
);

const LowStockModal = ({ isOpen, onClose, products }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50 transition-opacity duration-300">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Productos con Bajo Inventario</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                </div>
                <div className="overflow-y-auto max-h-96">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b text-sm text-gray-500">
                                <th className="p-2 font-medium">Producto</th>
                                <th className="p-2 font-medium">Stock Restante</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product.id} className="border-b hover:bg-gray-50">
                                    <td className="p-2 font-semibold text-gray-700">{product.name}</td>
                                    <td className="p-2">
                                        <span className="font-bold text-orange-600">{product.stock}</span> unidades
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---
export default function HomePage() {
  const [stats, setStats] = useState<Stats>({ salesToday: 0, newClients: 0, lowStockCount: 0, monthlySales: 0 });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productsData: Product[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      const lowStockItems = productsData.filter(p => p.stock <= 10);
      setLowStockProducts(lowStockItems);
      setStats(prev => ({ ...prev, lowStockCount: lowStockItems.length }));
    });

    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const clientsData: Client[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      const newClientsToday = clientsData.filter(c => c.createdAt && c.createdAt.toDate() >= startOfToday).length;
      setStats(prev => ({ ...prev, newClients: newClientsToday }));
    });

    const salesQuery = query(collection(db, 'sales'), orderBy('createdAt', 'desc'));
    const unsubSales = onSnapshot(salesQuery, (snapshot) => {
      const salesData: Sale[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
      
      const salesTodayTotal = salesData
        .filter(s => s.createdAt.toDate() >= startOfToday)
        .reduce((sum, s) => sum + s.total, 0);
      
      const monthlySalesTotal = salesData
        .filter(s => s.createdAt.toDate() >= startOfMonth)
        .reduce((sum, s) => sum + s.total, 0);

      setStats(prev => ({ ...prev, salesToday: salesTodayTotal, monthlySales: monthlySalesTotal }));
      setRecentSales(salesData.slice(0, 5));

      const monthlySalesData = salesData.filter(s => s.createdAt.toDate() >= startOfMonth);
      const productCounts = monthlySalesData.flatMap(s => s.items).reduce((acc, item) => {
        acc[item.productName] = (acc[item.productName] || 0) + item.quantity;
        return acc;
      }, {});
      
      const sortedProducts = Object.entries(productCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 4)
        .map(([name, sold]) => ({ name, sold: sold as number }));
      
      setTopProducts(sortedProducts);
      setLoading(false);
    });

    return () => {
      unsubProducts();
      unsubClients();
      unsubSales();
    };
  }, []);

  const statsCards = [
    { title: "Ventas de Hoy", value: `$${stats.salesToday.toFixed(2)}`, icon: DollarSign, color: "text-pink-500" },
    { title: "Nuevos Clientes (Hoy)", value: `${stats.newClients}`, icon: Users, color: "text-blue-500" },
    { title: "Productos Bajos de Stock", value: `${stats.lowStockCount}`, icon: Package, color: "text-orange-500", isClickable: true },
    { title: "Ventas del Mes", value: `$${stats.monthlySales.toFixed(2)}`, icon: ShoppingCart, color: "text-green-500" },
  ];

  return (
    <div className="flex h-screen font-sans">
      <Sidebar activeMenu="Dashboard" />

      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">¡Bienvenida de nuevo!</h2>
          <p className="text-gray-500 mt-1">Aquí tienes un resumen de tu negocio hoy.</p>
        </header>
        
        {loading ? <p className="text-center text-gray-500">Cargando estadísticas...</p> : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statsCards.map(card => (
                <div 
                  key={card.title} 
                  onClick={card.isClickable ? () => setIsLowStockModalOpen(true) : undefined}
                  className={card.isClickable ? "cursor-pointer" : ""}
                >
                  <StatCard {...card} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <RecentSalesTable sales={recentSales} />
                </div>
                <div>
                    <TopProductsList products={topProducts} />
                </div>
            </div>
          </>
        )}
      </main>
      <LowStockModal 
        isOpen={isLowStockModalOpen}
        onClose={() => setIsLowStockModalOpen(false)}
        products={lowStockProducts}
      />
    </div>
  );
}
