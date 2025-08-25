'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import Sidebar from '@/components/Sidebar';

// --- TIPOS DE DATOS ---
interface Sale {
  id: string;
  clientName: string;
  clientId: string;
  total: number;
  amountPaid: number;
  status: 'Pagado' | 'Pendiente';
  createdAt: Timestamp; // <-- CORRECCIÓN: De 'any' a 'Timestamp'
}

interface DebtByClient {
  clientId: string;
  clientName: string;
  totalDebt: number;
  sales: Sale[];
}

// --- COMPONENTE PRINCIPAL ---
export default function DebtsPage() {
  const [debts, setDebts] = useState<DebtByClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<DebtByClient | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'sales'), where('status', '==', 'Pendiente'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pendingSales: Sale[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
      
      const debtsByClient = pendingSales.reduce((acc, sale) => {
        if (!acc[sale.clientId]) {
          acc[sale.clientId] = {
            clientId: sale.clientId,
            clientName: sale.clientName,
            totalDebt: 0,
            sales: [],
          };
        }
        acc[sale.clientId].sales.push(sale);
        acc[sale.clientId].totalDebt += (sale.total - sale.amountPaid);
        return acc;
      }, {} as { [key: string]: DebtByClient });

      setDebts(Object.values(debtsByClient).sort((a, b) => b.totalDebt - a.totalDebt));
    });

    return () => unsubscribe();
  }, []);
  
  const filteredDebts = useMemo(() => {
    return debts.filter(debt => 
      debt.clientName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [debts, searchQuery]);

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || paymentAmount <= 0) {
      alert("Selecciona un cliente y un monto válido.");
      return;
    }

    let remainingPayment = paymentAmount;

    try {
      for (const sale of selectedClient.sales) {
        if (remainingPayment <= 0) break;

        const debtAmount = sale.total - sale.amountPaid;
        const paymentForThisSale = Math.min(remainingPayment, debtAmount);
        
        const saleRef = doc(db, 'sales', sale.id);
        const newAmountPaid = sale.amountPaid + paymentForThisSale;
        const newStatus = newAmountPaid >= sale.total ? 'Pagado' : 'Pendiente';

        await updateDoc(saleRef, {
          amountPaid: newAmountPaid,
          status: newStatus,
        });

        remainingPayment -= paymentForThisSale;
      }
      
      await addDoc(collection(db, 'payments'), {
          clientId: selectedClient.clientId,
          clientName: selectedClient.clientName,
          amount: paymentAmount,
          createdAt: new Date(),
      });

      alert("Pago registrado con éxito.");
      setSelectedClient(null);
      setPaymentAmount(0);

    } catch (error) {
      console.error("Error al registrar el pago: ", error);
      alert("Hubo un error al registrar el pago.");
    }
  };

  return (
    <div className="flex h-screen font-sans bg-gray-50">
      <Sidebar activeMenu="Deudas" />

      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Control de Deudas</h2>
          <p className="text-gray-500 mt-1">Visualiza y gestiona los pagos pendientes de tus clientes.</p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-bold text-lg mb-4">Clientes con Saldo Pendiente</h3>
            <div className="relative mb-4">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                </span>
                <input
                    type="text"
                    placeholder="Buscar cliente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-2 pl-10 border border-gray-300 rounded-lg"
                />
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {filteredDebts.map(debt => (
                <div key={debt.clientId} onClick={() => setSelectedClient(debt)} 
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${selectedClient?.clientId === debt.clientId ? 'bg-pink-100 border-pink-400 border' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <p className="font-semibold text-gray-800">{debt.clientName}</p>
                  <p className="text-sm text-red-600 font-bold">Deuda: ${debt.totalDebt.toFixed(2)}</p>
                </div>
              ))}
              {filteredDebts.length === 0 && <p className="text-center text-gray-500 py-4">No se encontraron clientes.</p>}
            </div>
          </div>

          <div className="md:col-span-2 bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="font-bold text-lg mb-4">Detalle y Registro de Pago</h3>
            {selectedClient ? (
              <div>
                <h4 className="text-xl font-semibold mb-2">{selectedClient.clientName}</h4>
                <p className="font-bold text-2xl text-red-600 mb-4">Total Adeudado: ${selectedClient.totalDebt.toFixed(2)}</p>
                
                <div className="mb-6">
                  <h5 className="font-semibold mb-2">Ventas Pendientes:</h5>
                  <ul className="space-y-1 text-sm list-disc list-inside">
                    {selectedClient.sales.map(s => (
                      <li key={s.id}>
                        Venta del {s.createdAt.toDate().toLocaleDateString()} - 
                        <span className="font-medium"> Saldo: ${(s.total - s.amountPaid).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <form onSubmit={handleRegisterPayment}>
                  <label htmlFor="payment" className="block text-sm font-medium text-gray-700 mb-1">Monto a Pagar</label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="number" 
                      id="payment"
                      step="0.01"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                      className="w-full max-w-xs p-3 border border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                    <button type="submit" className="bg-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-pink-600">
                      Registrar Pago
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="text-center py-20 text-gray-500">
                <p>Selecciona un cliente de la lista para ver sus deudas y registrar un pago.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
