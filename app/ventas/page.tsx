'use client';

import React, { useState, useEffect, useMemo } from 'react';
// **CORRECCIÓN: Se limpiaron los íconos no utilizados**
import { Search, X, Plus, Minus, UserPlus, Trash2, CreditCard, DollarSign } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, QuerySnapshot, DocumentData, addDoc, doc, runTransaction } from 'firebase/firestore';
import Sidebar from '@/components/Sidebar';

// --- TIPOS DE DATOS ---
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface CartItem extends Product {
  quantity: number;
}

// --- COMPONENTE PRINCIPAL DE LA PÁGINA DE VENTAS (POS) ---
export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [productSearch, setProductSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isSelectClientModalOpen, setIsSelectClientModalOpen] = useState(false);
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    const productsUnsub = onSnapshot(collection(db, 'products'), (snapshot: QuerySnapshot<DocumentData>) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
    const clientsUnsub = onSnapshot(collection(db, 'clients'), (snapshot: QuerySnapshot<DocumentData>) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    });
    return () => {
      productsUnsub();
      clientsUnsub();
    };
  }, []);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
        alert("Este producto no tiene stock disponible.");
        return;
    }
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const productInStock = products.find(p => p.id === productId);
    if (!productInStock) return;
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity: Math.min(newQuantity, productInStock.stock) } : item
      )
    );
  };
  
  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cart]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newClientData.name.trim() === '' || newClientData.phone.trim() === '') {
      alert("El nombre y el teléfono son obligatorios.");
      return;
    }
    try {
      const clientPayload = { ...newClientData, createdAt: new Date() };
      const docRef = await addDoc(collection(db, 'clients'), clientPayload);
      
      setSelectedClient({ id: docRef.id, ...newClientData });
      setIsCreateClientModalOpen(false);
      setNewClientData({ name: '', phone: '', email: '' });
    } catch (error) {
      console.error("Error al crear el cliente: ", error);
      alert("Hubo un error al crear el cliente.");
    }
  };

  const handleCompleteSale = async (status: 'Pagado' | 'Pendiente') => {
    if (cart.length === 0) {
      alert("El carrito está vacío.");
      return;
    }
    if (!selectedClient) {
      alert("Por favor, selecciona un cliente.");
      return;
    }
    try {
      await runTransaction(db, async (transaction) => {
        const productRefsAndData = cart.map(item => ({
          ref: doc(db, 'products', item.id),
          cartItem: item,
        }));

        const productDocs = await Promise.all(
          productRefsAndData.map(item => transaction.get(item.ref))
        );

        // **CORRECCIÓN AQUÍ: Se combinan la validación y la actualización en un solo bucle**
        for (let i = 0; i < productDocs.length; i++) {
          const productDoc = productDocs[i];
          const { cartItem } = productRefsAndData[i];

          if (!productDoc.exists()) {
            throw new Error(`El producto "${cartItem.name}" ya no existe.`);
          }

          const currentStock = productDoc.data().stock;
          if (currentStock < cartItem.quantity) {
            throw new Error(`Stock insuficiente para "${cartItem.name}". Solo quedan ${currentStock}.`);
          }
          
          // Se calcula y se actualiza el stock en el mismo bucle
          const newStock = currentStock - cartItem.quantity;
          transaction.update(productDoc.ref, { stock: newStock });
        }
        
        const newSaleRef = doc(collection(db, 'sales'));
        const saleData = {
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          items: cart.map(item => ({
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          total: cartTotal,
          status: status,
          amountPaid: status === 'Pagado' ? cartTotal : 0,
          createdAt: new Date(),
        };
        
        transaction.set(newSaleRef, saleData);
      });
      
      setCart([]);
      setSelectedClient(null);
      setClientSearch('');
      setProductSearch('');
      alert(`¡Venta completada como "${status}"!`);

    } catch (error) {
      console.error("Error al completar la venta: ", error);
      alert((error as Error).message || "Hubo un error al procesar la venta. El Stock no ha sido modificado.");
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));

  return (
    <div className="flex h-screen font-sans bg-gray-50">
      <Sidebar activeMenu="Ventas" />

      <div className="flex-1 flex">
        <div className="w-3/5 p-6 flex flex-col">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              className="w-full p-3 pl-10 border rounded-lg"
            />
          </div>
          <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pr-2">
            {products.map(product => (
              <div 
                key={product.id} 
                onClick={() => addToCart(product)} 
                className={`group p-4 rounded-xl shadow-sm border transition-all flex flex-col justify-between h-32 ${
                  product.stock > 0 
                    ? 'cursor-pointer bg-white hover:bg-pink-500 hover:shadow-lg hover:scale-105' 
                    : 'bg-gray-100 opacity-60'
                }`}
              >
                <div>
                  <p className="font-bold text-gray-800 truncate group-hover:text-white">{product.name}</p>
                  <p className="text-sm text-gray-500 group-hover:text-pink-100">${product.price.toFixed(2)}</p>
                </div>
                <p className={`text-xs font-medium mt-2 self-end ${
                  product.stock > 0 
                    ? 'text-green-600 group-hover:text-white' 
                    : 'text-red-600'
                }`}>
                  {product.stock > 0 ? `${product.stock} en stock` : 'Agotado'}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="w-2/5 bg-white border-l p-6 flex flex-col">
          <h2 className="text-2xl font-bold mb-4">Detalle de Venta</h2>
          <div className="mb-4 p-4 border rounded-lg">
            {selectedClient ? (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold">{selectedClient.name}</p>
                  <p className="text-sm text-gray-500">{selectedClient.phone}</p>
                </div>
                <button onClick={() => setSelectedClient(null)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><X size={18}/></button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button onClick={() => setIsSelectClientModalOpen(true)} className="w-full flex items-center justify-center p-3 bg-gray-100 hover:bg-gray-200 rounded-lg">
                  <UserPlus size={20} className="mr-2 text-gray-600" />
                  Seleccionar Cliente
                </button>
                <button onClick={() => setIsCreateClientModalOpen(true)} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg">
                  <Plus size={20} className="text-gray-600" />
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {cart.length > 0 ? cart.map(item => (
              <div key={item.id} className="flex items-center justify-between mb-3 p-2 rounded-lg hover:bg-gray-50">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 bg-gray-200 rounded-full"><Minus size={14}/></button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                    className="w-12 text-center font-medium bg-transparent"
                  />
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 bg-gray-200 rounded-full"><Plus size={14}/></button>
                  <button onClick={() => removeFromCart(item.id)} className="ml-4 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
            )) : <p className="text-center text-gray-500 mt-10">El carrito está vacío</p>}
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-xl font-bold mb-4">
              <span>Total:</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex space-x-2">
                <button 
                  onClick={() => handleCompleteSale('Pendiente')}
                  disabled={cart.length === 0 || !selectedClient}
                  className="w-full flex items-center justify-center bg-orange-500 text-white p-3 rounded-lg font-bold hover:bg-orange-600 disabled:bg-gray-300"
                >
                  <CreditCard size={20} className="mr-2"/>
                  Guardar al Crédito
                </button>
                <button 
                  onClick={() => handleCompleteSale('Pagado')}
                  disabled={cart.length === 0 || !selectedClient}
                  className="w-full flex items-center justify-center bg-green-500 text-white p-3 rounded-lg font-bold hover:bg-green-600 disabled:bg-gray-300"
                >
                  <DollarSign size={20} className="mr-2"/>
                  Cobrar
                </button>
            </div>
          </div>
        </div>
      </div>

      {isSelectClientModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg flex flex-col h-2/3">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Seleccionar Cliente</h3>
              <button onClick={() => setIsSelectClientModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
            </div>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              className="w-full p-3 mb-4 border rounded-lg"
            />
            <div className="flex-1 overflow-y-auto">
              {filteredClients.map(client => (
                <div key={client.id} onClick={() => { setSelectedClient(client); setIsSelectClientModalOpen(false); }} className="p-3 mb-2 rounded-lg hover:bg-pink-50 cursor-pointer">
                  <p className="font-semibold">{client.name}</p>
                  <p className="text-sm text-gray-500">{client.phone}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isCreateClientModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Nuevo Cliente</h3>
            <form onSubmit={handleCreateClient}>
              <div className="space-y-4">
                <div>
                    <label htmlFor="new-name" className="block text-sm font-medium text-gray-600 mb-1">Nombre Completo</label>
                    <input id="new-name" type="text" value={newClientData.name} onChange={(e) => setNewClientData({...newClientData, name: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg" />
                </div>
                <div>
                    <label htmlFor="new-phone" className="block text-sm font-medium text-gray-600 mb-1">Teléfono</label>
                    <input id="new-phone" type="tel" value={newClientData.phone} onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg" />
                </div>
                <div>
                    <label htmlFor="new-email" className="block text-sm font-medium text-gray-600 mb-1">Email (Opcional)</label>
                    <input id="new-email" type="email" value={newClientData.email} onChange={(e) => setNewClientData({...newClientData, email: e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-8">
                <button type="button" onClick={() => setIsCreateClientModalOpen(false)} className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-pink-500 text-white rounded-lg">Crear y Seleccionar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
