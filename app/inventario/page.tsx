'use client'; // Marcar como Client Component para usar hooks (useState, useEffect)

import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Edit, Search} from 'lucide-react';
import { db } from '../lib/firebase'; // Importar la instancia de la base de datos
import { collection, addDoc, onSnapshot, QuerySnapshot, DocumentData, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import Sidebar from '@/components/Sidebar';

// --- TIPOS DE DATOS ---
interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

// --- COMPONENTE PRINCIPAL DE LA PÁGINA DE INVENTARIO ---
export default function InventoryPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estado para el formulario, usado tanto para agregar como para editar
  const [formData, setFormData] = useState({ name: '', sku: '', price: 0, stock: 0 });
  
  // Estado para saber si estamos editando un producto existente
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // --- EFECTO PARA LEER DATOS DE FIREBASE EN TIEMPO REAL ---
  useEffect(() => {
    const q = collection(db, 'products');
    const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const productsData: Product[] = [];
      querySnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(productsData);
    });

    return () => unsubscribe();
  }, []);

  // --- LÓGICA DE BÚSQUEDA ---
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- MANEJO DEL MODAL ---
  const openModalForAdd = () => {
    setEditingProduct(null);
    setFormData({ name: '', sku: '', price: 0, stock: 0 });
    setIsModalOpen(true);
  };

  const openModalForEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({ name: product.name, sku: product.sku, price: product.price, stock: product.stock });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({ name: '', sku: '', price: 0, stock: 0 });
  };

  // --- FUNCIONES CRUD (Create, Update, Delete) ---
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim() === '' || formData.sku.trim() === '' || formData.price <= 0 || formData.stock < 0) {
      alert("Por favor, completa todos los campos correctamente.");
      return;
    }

    try {
      if (editingProduct) {
        const productRef = doc(db, 'products', editingProduct.id);
        await updateDoc(productRef, formData);
      } else {
        await addDoc(collection(db, 'products'), formData);
      }
      closeModal();
    } catch (error) {
      console.error("Error al guardar el producto: ", error);
      alert("Hubo un error al guardar el producto.");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este producto?")) {
        try {
            await deleteDoc(doc(db, 'products', productId));
        } catch (error) {
            console.error("Error al eliminar el producto: ", error);
            alert("Hubo un error al eliminar el producto.");
        }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: name === 'price' || name === 'stock' ? parseFloat(value) || 0 : value
    }));
  };


  return (
    <div className="flex h-screen font-sans bg-gray-50">
      <Sidebar activeMenu="Inventario" />
      {/* Contenido Principal */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Inventario</h2>
            <p className="text-gray-500 mt-1">Gestiona todos tus productos en un solo lugar.</p>
          </div>
          <button
            onClick={openModalForAdd}
            className="flex items-center bg-pink-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-pink-600 transition-colors duration-300"
          >
            <PlusCircle size={20} className="mr-2" />
            Agregar Producto
          </button>
        </header>

        {/* Barra de Búsqueda y Filtros */}
        <div className="mb-6">
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                </span>
                <input
                    type="text"
                    placeholder="Buscar producto por nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full max-w-sm p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
            </div>
        </div>

        {/* Tabla de Productos */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 text-sm text-gray-500">
                  <th className="py-3 px-4 font-medium">Nombre</th>
                  <th className="py-3 px-4 font-medium">SKU</th>
                  <th className="py-3 px-4 font-medium">Precio</th>
                  <th className="py-3 px-4 font-medium">Stock</th>
                  <th className="py-3 px-4 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-pink-50/50">
                      <td className="py-4 px-4 font-semibold text-gray-800">{product.name}</td>
                      <td className="py-4 px-4 text-gray-600">{product.sku}</td>
                      <td className="py-4 px-4 text-gray-800">${product.price.toFixed(2)}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          product.stock > 10 ? 'bg-green-100 text-green-700' : 
                          product.stock > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {product.stock} unidades
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button onClick={() => openModalForEdit(product)} className="text-gray-400 hover:text-gray-700 p-1"><Edit size={18} /></button>
                        <button onClick={() => handleDeleteProduct(product.id)} className="text-gray-400 hover:text-red-600 p-1 ml-2"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-500">
                      {searchQuery ? 'No se encontraron productos.' : 'No hay productos en el inventario. ¡Agrega el primero!'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal para Agregar/Editar Producto */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <form onSubmit={handleFormSubmit}>
              <div className="space-y-4">
                <input type="text" name="name" placeholder="Nombre del producto" value={formData.name} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400" />
                <input type="text" name="sku" placeholder="SKU (ej. KG-001)" value={formData.sku} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400" />
                <div className="flex space-x-4">
                  <div className="w-1/2">
                    <label htmlFor="price" className="block text-sm font-medium text-gray-600 mb-1">Precio</label>
                    <input id="price" type="number" step="0.01" name="price" placeholder="25.00" value={formData.price} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400" />
                  </div>
                  <div className="w-1/2">
                    <label htmlFor="stock" className="block text-sm font-medium text-gray-600 mb-1">Stock</label>
                    <input id="stock" type="number" name="stock" placeholder="100" value={formData.stock} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-4 mt-8">
                <button type="button" onClick={closeModal} className="px-6 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
