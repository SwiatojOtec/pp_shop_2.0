import { API_URL } from '../../apiConfig';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import './Admin.css';

export default function AdminProducts() {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const navigate = useNavigate();

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch('${API_URL}/api/products');
            if (res.ok) {
                const data = await res.json();
                setProducts(Array.isArray(data) ? data : []);
            } else {
                console.error('Failed to fetch products');
                setProducts([]);
            }
        } catch (err) {
            console.error('Error fetching products:', err);
            setProducts([]);
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const handleDelete = async (id) => {
        if (window.confirm('Р’Рё РІРїРµРІРЅРµРЅС–?')) {
            await fetch(`${API_URL}/api/products/${id}`, { method: 'DELETE' });
            fetchProducts();
        }
    };

    return (
        <div className="admin-products">
            <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 className="admin-title" style={{ margin: 0 }}>РўРѕРІР°СЂРё</h1>
                <button className="btn btn-primary" onClick={() => navigate('/admin/products/new')}>
                    <Plus size={20} /> Р”РѕРґР°С‚Рё С‚РѕРІР°СЂ
                </button>
            </div>

            <div className="admin-filters" style={{ display: 'flex', gap: '20px', marginBottom: '20px', background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                <div className="search-box" style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                    <input
                        type="text"
                        placeholder="РџРѕС€СѓРє Р·Р° РЅР°Р·РІРѕСЋ Р°Р±Рѕ SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }}
                    />
                </div>
                <div className="filter-box" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Filter size={18} style={{ color: '#999' }} />
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }}
                    >
                        <option value="All">Р’СЃС– РєР°С‚РµРіРѕСЂС–С—</option>
                        <option value="РџР°СЂРєРµС‚РЅР° РґРѕС€РєР°">РџР°СЂРєРµС‚РЅР° РґРѕС€РєР°</option>
                        <option value="Р›Р°РјС–РЅР°С‚">Р›Р°РјС–РЅР°С‚</option>
                        <option value="Р’С–РЅС–Р»">Р’С–РЅС–Р»</option>
                        <option value="Р”РІРµСЂС–">Р”РІРµСЂС–</option>
                    </select>
                </div>
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Р—РѕР±СЂР°Р¶РµРЅРЅСЏ</th>
                            <th>SKU</th>
                            <th>РќР°Р·РІР°</th>
                            <th>Р¦С–РЅР°</th>
                            <th>РљР°С‚РµРіРѕСЂС–СЏ</th>
                            <th>Р”С–С—</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(product => (
                            <tr key={product.id}>
                                <td><img src={product.image} alt={product.name} className="admin-table-img" /></td>
                                <td><code style={{ background: '#eee', padding: '2px 6px', borderRadius: '4px' }}>{product.sku}</code></td>
                                <td>{product.name}</td>
                                <td>{product.price} в‚ґ</td>
                                <td>{product.category}</td>
                                <td>
                                    <div className="table-actions">
                                        <button onClick={() => navigate(`/admin/products/${product.id}`)} className="action-btn edit"><Edit2 size={18} /></button>
                                        <button onClick={() => handleDelete(product.id)} className="action-btn delete"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>РўРѕРІР°СЂС–РІ РЅРµ Р·РЅР°Р№РґРµРЅРѕ</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

