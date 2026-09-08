import { blogApi } from '../../services/api';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, FileText } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../features/admin/ui/PageHeader';
import Toolbar from '../../features/admin/ui/Toolbar';
import DataTable from '../../features/admin/ui/DataTable';
import StatusBadge from '../../features/admin/ui/StatusBadge';
import ConfirmDialog from '../../features/admin/ui/ConfirmDialog';
import './Admin.css';

export default function AdminBlog() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const navigate = useNavigate();
    const { showToast } = useToast();

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const data = await blogApi.list();
            setPosts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching posts:', err);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredPosts = useMemo(
        () => posts.filter((p) => p.title.toLowerCase().includes(searchTerm.toLowerCase())),
        [posts, searchTerm]
    );

    async function handleDeleteConfirm() {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await blogApi.remove(deleteTarget.id);
            await fetchPosts();
            setDeleteTarget(null);
        } catch (err) {
            showToast(err.message || 'Помилка видалення статті', 'warning');
        } finally {
            setDeleteLoading(false);
        }
    }

    const columns = useMemo(() => [
        {
            key: 'image',
            label: 'Зображення',
            render: (val, post) => <img src={val} alt={post.title} className="admin-table-img" />,
        },
        { key: 'title', label: 'Заголовок' },
        {
            key: 'category',
            label: 'Категорія',
            render: (val) => <StatusBadge tone="neutral" label={val} />,
        },
        {
            key: 'date',
            label: 'Дата',
            render: (val) => new Date(val).toLocaleDateString(),
        },
        {
            key: 'id',
            label: 'Дії',
            align: 'right',
            render: (_, post) => (
                <div className="flex gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                    <button type="button" className="action-btn delete" onClick={() => setDeleteTarget(post)} title="Видалити">
                        <Trash2 size={15} />
                    </button>
                </div>
            ),
        },
    ], []);

    return (
        <div className="admin-products">
            <PageHeader
                title="Блог"
                subtitle={`${filteredPosts.length} з ${posts.length} статей`}
                actions={(
                    <button type="button" className="ds-btn ds-btn--primary" onClick={() => navigate('/admin/blog/new')}>
                        <Plus size={16} /> Додати статтю
                    </button>
                )}
            />

            <Toolbar search={searchTerm} onSearch={setSearchTerm} placeholder="Пошук за заголовком..." />

            <DataTable
                columns={columns}
                rows={filteredPosts}
                loading={loading}
                onRowClick={(post) => navigate(`/admin/blog/${post.id}`)}
                emptyIcon={FileText}
                emptyTitle="Статей не знайдено"
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Видалити статтю?"
                message={deleteTarget ? `Видалити статтю «${deleteTarget.title}»? Цю дію не можна скасувати.` : ''}
                confirmText="Видалити"
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
                loading={deleteLoading}
            />
        </div>
    );
}
