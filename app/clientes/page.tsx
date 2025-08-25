'use client'; 

import React, { useState, useEffect } from 'react';
import { Home, Package, ShoppingCart, Users, PlusCircle, Trash2, Edit, Search, List, LayoutGrid, FileText, Calendar } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, QuerySnapshot, DocumentData, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import Sidebar from '@/components/Sidebar';

// --- TIPOS DE DATOS ---
interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
}

// --- COMPONENTE DE TARJETA DE CLIENTE ---
const ClientCard = ({ client, onEdit, onDelete }: { client: Client, onEdit: () => void, onDelete: () => void }) => {
  const initial = client.name ? client.name.charAt(0).toUpperCase() : '?';

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between">
      <div>
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center text-xl font-bold mr-4">
            {initial}
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-lg">{client.name}</h3>
            <p className="text-sm text-gray-500">{client.phone}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 break-all">{client.email || 'Sin correo electrónico'}</p>
      </div>
      <div className="flex justify-end space-x-2 mt-4">
        <button onClick={onEdit} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
          <Edit size={18} />
        </button>
        <button onClick={onDelete} className="p-2 text-gray-500 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors">
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};


// --- COMPONENTE PRINCIPAL DE LA PÁGINA DE CLIENTES ---
export default function ClientsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
  
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
    const q = collection(db, 'clients');
    const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const clientsData: Client[] = [];
      querySnapshot.forEach((doc) => {
        clientsData.push({ id: doc.id, ...doc.data() } as Client);
      });
      setClients(clientsData);
    });
    return () => unsubscribe();
  }, []);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone.includes(searchQuery)
  );

  const openModalForAdd = () => {
    setEditingClient(null);
    setFormData({ name: '', phone: '', email: '' });
    setIsModalOpen(true);
  };

  const openModalForEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({ name: client.name, phone: client.phone, email: client.email });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    setFormData({ name: '', phone: '', email: '' });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim() === '' || formData.phone.trim() === '') {
      alert("El nombre y el teléfono son obligatorios.");
      return;
    }
    try {
      if (editingClient) {
        const clientRef = doc(db, 'clients', editingClient.id);
        await updateDoc(clientRef, formData);
      } else {
        // **CORRECCIÓN AQUÍ: Añadimos el campo createdAt**
        await addDoc(collection(db, 'clients'), { ...formData, createdAt: new Date() });
      }
      closeModal();
    } catch (error) {
      console.error("Error al guardar el cliente: ", error);
      alert("Hubo un error al guardar el cliente.");
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este cliente?")) {
        try {
            await deleteDoc(doc(db, 'clients', clientId));
        } catch (error) {
            console.error("Error al eliminar el cliente: ", error);
            alert("Hubo un error al eliminar el cliente.");
        }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({ ...prevState, [name]: value }));
  };

  return (
    <div className="flex h-screen font-sans bg-gray-50">
      <Sidebar activeMenu="Clientes" />

      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Clientes</h2>
            <p className="text-gray-500 mt-1">Administra la información de tus clientes.</p>
          </div>
          <button
            onClick={openModalForAdd}
            className="flex items-center bg-pink-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-pink-600 transition-colors duration-300"
          >
            <PlusCircle size={20} className="mr-2" />
            Agregar Cliente
          </button>
        </header>

        <div className="flex justify-between items-center mb-6">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-sm p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>
          <div className="flex items-center space-x-2 p-1 bg-gray-200 rounded-lg">
            <button onClick={() => setViewMode('card')} className={`p-2 rounded-md transition-colors ${viewMode === 'card' ? 'bg-white text-pink-500 shadow' : 'text-gray-500'}`}>
              <LayoutGrid size={20} />
            </button>
            <button onClick={() => setViewMode('table')} className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white text-pink-500 shadow' : 'text-gray-500'}`}>
              <List size={20} />
            </button>
          </div>
        </div>

        {viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredClients.length > 0 ? (
              filteredClients.map(client => (
                <ClientCard 
                  key={client.id} 
                  client={client} 
                  onEdit={() => openModalForEdit(client)}
                  onDelete={() => handleDeleteClient(client.id)}
                />
              ))
            ) : (
              <p className="text-center text-gray-500 col-span-full py-10">
                {searchQuery ? 'No se encontraron clientes.' : 'No hay clientes registrados.'}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500">
                    <th className="py-3 px-4 font-medium">Nombre</th>
                    <th className="py-3 px-4 font-medium">Teléfono</th>
                    <th className="py-3 px-4 font-medium">Email</th>
                    <th className="py-3 px-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <tr key={client.id} className="border-b border-gray-100 hover:bg-pink-50/50">
                        <td className="py-4 px-4 font-semibold text-gray-800">{client.name}</td>
                        <td className="py-4 px-4 text-gray-600">{client.phone}</td>
                        <td className="py-4 px-4 text-gray-600">{client.email || 'N/A'}</td>
                        <td className="py-4 px-4">
                          <button onClick={() => openModalForEdit(client)} className="text-gray-400 hover:text-gray-700 p-1"><Edit size={18} /></button>
                          <button onClick={() => handleDeleteClient(client.id)} className="text-gray-400 hover:text-red-600 p-1 ml-2"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-gray-500">
                        {searchQuery ? 'No se encontraron clientes.' : 'No hay clientes registrados.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
            <form onSubmit={handleFormSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-600 mb-1">Nombre Completo</label>
                  <input id="name" type="text" name="name" placeholder="Ej. Ana García" value={formData.name} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400" />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-600 mb-1">Teléfono</label>
                  <input id="phone" type="tel" name="phone" placeholder="Ej. 9876-5432" value={formData.phone} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-1">Email (Opcional)</label>
                  <input id="email" type="email" name="email" placeholder="Ej. ana.garcia@email.com" value={formData.email} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400" />
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-8">
                <button type="button" onClick={closeModal} className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
