'use client';

import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import Sidebar from '@/components/Sidebar';

// --- TIPOS DE DATOS ---
interface Sale {
  id: string;
  clientName: string;
  clientId: string;
  total: number;
  status: 'Pagado' | 'Pendiente';
  amountPaid: number;
  createdAt: Timestamp;
  items: { productName: string; quantity: number }[];
}

interface SalesReportData {
  totalRevenue: number;
  numberOfSales: number;
  topProduct: { name: string; sold: number } | null;
  sales: Sale[];
}

interface DebtByClient {
  clientName: string;
  clientId: string;
  totalOwed: number;
  salesCount: number;
}

interface DebtsReportData {
  totalDebt: number;
  clientsInDebtCount: number;
  debtsByClient: DebtByClient[];
}

// --- COMPONENTE PRINCIPAL ---
export default function ReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState<'sales' | 'debts'>('sales');
  const [salesReport, setSalesReport] = useState<SalesReportData | null>(null);
  const [debtsReport, setDebtsReport] = useState<DebtsReportData | null>(null);
  const [debtSearchQuery, setDebtSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const generateSalesReport = async (start: Date, end: Date) => {
    const salesRef = collection(db, 'sales');
    const q = query(
      salesRef,
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end)),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const salesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));

    const totalRevenue = salesData.reduce((sum, sale) => sum + sale.total, 0);
    
    // **CORRECCIÓN AQUÍ**
    const productCounts = salesData.flatMap(s => s.items).reduce((acc, item) => {
      acc[item.productName] = (acc[item.productName] || 0) + item.quantity;
      return acc;
    }, {} as { [key: string]: number });

    const topProductEntry = Object.entries(productCounts).sort(([, a], [, b]) => b - a)[0];
    const topProduct = topProductEntry ? { name: topProductEntry[0], sold: topProductEntry[1] } : null;

    setSalesReport({ totalRevenue, numberOfSales: salesData.length, topProduct, sales: salesData });
    setDebtsReport(null);
  };

  const generateDebtsReport = async (start: Date, end: Date) => {
    const salesRef = collection(db, 'sales');
    const q = query(
      salesRef,
      where('status', '==', 'Pendiente'),
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end))
    );
    const querySnapshot = await getDocs(q);
    const debtSales = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));

    // **CORRECCIÓN AQUÍ**
    const debtsByClient = debtSales.reduce((acc, sale) => {
      const debtAmount = sale.total - sale.amountPaid;
      if (!acc[sale.clientId]) {
        acc[sale.clientId] = {
          clientId: sale.clientId,
          clientName: sale.clientName,
          totalOwed: 0,
          salesCount: 0,
        };
      }
      acc[sale.clientId].totalOwed += debtAmount;
      acc[sale.clientId].salesCount += 1;
      return acc;
    }, {} as { [key: string]: DebtByClient });

    const totalDebt = Object.values(debtsByClient).reduce((sum, client) => sum + client.totalOwed, 0);
    
    setDebtsReport({
      totalDebt,
      clientsInDebtCount: Object.keys(debtsByClient).length,
      debtsByClient: Object.values(debtsByClient).sort((a,b) => b.totalOwed - a.totalOwed),
    });
    setSalesReport(null);
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert("Por favor, selecciona un rango de fechas.");
      return;
    }
    setLoading(true);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    try {
      if (reportType === 'sales') {
        await generateSalesReport(start, end);
      } else {
        await generateDebtsReport(start, end);
      }
    } catch (error) {
      console.error("Error generando el reporte: ", error);
      alert("Hubo un error al generar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  const filteredDebts = useMemo(() => {
    if (!debtsReport) return [];
    return debtsReport.debtsByClient.filter(debt =>
      debt.clientName.toLowerCase().includes(debtSearchQuery.toLowerCase())
    );
  }, [debtsReport, debtSearchQuery]);


  return (
    <div className="flex h-screen font-sans bg-gray-50">
      <Sidebar activeMenu="Reportes" />

      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Reportes</h2>
          <p className="text-gray-500 mt-1">Analiza el rendimiento de tu negocio por periodos.</p>
        </header>
        
        <div className="bg-white p-6 rounded-xl border shadow-sm mb-8">
          <div className="flex border-b mb-4">
            <button onClick={() => setReportType('sales')} className={`py-2 px-4 text-sm font-medium ${reportType === 'sales' ? 'border-b-2 border-pink-500 text-pink-500' : 'text-gray-500'}`}>
              Reporte de Ventas
            </button>
            <button onClick={() => setReportType('debts')} className={`py-2 px-4 text-sm font-medium ${reportType === 'debts' ? 'border-b-2 border-pink-500 text-pink-500' : 'text-gray-500'}`}>
              Reporte de Deudas
            </button>
          </div>
          <form onSubmit={handleGenerateReport} className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Fecha de Inicio</label>
              <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">Fecha de Fin</label>
              <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border border-gray-300 rounded-lg" />
            </div>
            <button type="submit" disabled={loading} className="bg-pink-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-pink-600 disabled:bg-gray-400">
              {loading ? 'Generando...' : 'Generar Reporte'}
            </button>
          </form>
        </div>

        {salesReport && reportType === 'sales' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl border shadow-sm text-center"><p className="text-sm text-gray-500">Ingresos Totales</p><p className="text-3xl font-bold text-green-600">${salesReport.totalRevenue.toFixed(2)}</p></div>
              <div className="bg-white p-6 rounded-xl border shadow-sm text-center"><p className="text-sm text-gray-500">Número de Ventas</p><p className="text-3xl font-bold text-blue-600">{salesReport.numberOfSales}</p></div>
              <div className="bg-white p-6 rounded-xl border shadow-sm text-center"><p className="text-sm text-gray-500">Producto Estrella</p><p className="text-xl font-bold text-pink-600 truncate">{salesReport.topProduct?.name || 'N/A'}</p><p className="text-sm text-gray-500">{salesReport.topProduct ? `${salesReport.topProduct.sold} unidades` : ''}</p></div>
            </div>
            <div className="bg-white p-6 rounded-xl border shadow-sm"><h3 className="font-bold text-lg mb-4">Detalle de Ventas</h3><table className="w-full text-left"><thead><tr className="border-b text-sm text-gray-500"><th className="py-2 px-3">Fecha</th><th className="py-2 px-3">Cliente</th><th className="py-2 px-3">Total</th><th className="py-2 px-3">Estado</th></tr></thead><tbody>{salesReport.sales.map(sale => (<tr key={sale.id} className="border-b hover:bg-gray-50"><td className="py-2 px-3">{sale.createdAt.toDate().toLocaleDateString()}</td><td className="py-2 px-3">{sale.clientName}</td><td className="py-2 px-3 font-medium">${sale.total.toFixed(2)}</td><td className="py-2 px-3"><span className={`px-2 py-1 text-xs rounded-full ${sale.status === 'Pagado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{sale.status}</span></td></tr>))}</tbody></table></div>
          </div>
        )}

        {debtsReport && reportType === 'debts' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl border shadow-sm text-center"><p className="text-sm text-gray-500">Deuda Total Pendiente</p><p className="text-3xl font-bold text-red-600">${debtsReport.totalDebt.toFixed(2)}</p></div>
              <div className="bg-white p-6 rounded-xl border shadow-sm text-center"><p className="text-sm text-gray-500">Clientes con Deuda</p><p className="text-3xl font-bold text-orange-600">{debtsReport.clientsInDebtCount}</p></div>
            </div>
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Clientes con Mayor Deuda</h3>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={debtSearchQuery}
                        onChange={(e) => setDebtSearchQuery(e.target.value)}
                        className="w-full max-w-xs p-2 pl-10 border border-gray-300 rounded-lg"
                    />
                </div>
              </div>
              <table className="w-full text-left"><thead><tr className="border-b text-sm text-gray-500"><th className="py-2 px-3">Cliente</th><th className="py-2 px-3">Ventas a Crédito</th><th className="py-2 px-3">Total Adeudado</th></tr></thead><tbody>{filteredDebts.map(debt => (<tr key={debt.clientId} className="border-b hover:bg-gray-50"><td className="py-2 px-3">{debt.clientName}</td><td className="py-2 px-3">{debt.salesCount}</td><td className="py-2 px-3 font-medium text-red-600">${debt.totalOwed.toFixed(2)}</td></tr>))}</tbody></table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
