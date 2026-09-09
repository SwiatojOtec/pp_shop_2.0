import { blogApi } from '../../services/api';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, FileText } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../features/admin/ui/PageHeader';
import Toolbar from '../../features/admin/ui/Toolbar';
import DataTable from '../../features/admin/ui/DataTable';
import StatusBadge from '../../features/admin/ui/StatusBadge';
import ConfirmDialog from '../../features/admin/ui/ConfirmDialog';
import '../../features/admin/blog/blog.css';

const STATUS_META = {
    published: { label: 'Опубліковано', tone: 'success' },
    draft: { label: 'Чернетка', tone: 'neutral' },
};
const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, meta]) => ({ value, label: meta.label }));

function fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.${dt.getFullYear()}`;
}

export default function AdminBlog() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const searchTerm = searchParams.get('q') || '';
    const categoryFilter = searchParams.get('category') || '';
    const statusFilter = searchParams.get('status') || '';
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
            showToast(err.message || 'Не вдалося завантажити статті', 'warning');
            setPosts([]);
        } finally {
            setLoading(false);
        }
    };

    function updateParams(patch) {
        const next = new URLSearchParams(searchParams);
        Object.entries(patch).forEach(([key, value]) => {
            if (!value) next.delete(key);
            else next.set(key, value);
        });
        setSearchParams(next, { replace: true });
    }

    const categoryOptions = useMemo(() => {
        const set = new Set(posts.map((p) => p.category).filter(Boolean));
        return [...set].sort((a, b) => a.localeCompare(b, 'uk')).map((c) => ({ value: c, label: c }));
    }, [posts]);

    const filteredPosts = useMemo(() => posts.filter((p) => {
        const matchQ = !searchTerm || p.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategory = !categoryFilter || p.category === categoryFilter;
        const matchStatus = !statusFilter || p.status === statusFilter;
        return matchQ && matchCategory && matchStatus;
    }), [posts, searchTerm, categoryFilter, statusFilter]);

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
            render: (val, post) => <img src={val} alt={post.title} className="blog-list-thumb" />,
        },
        { key: 'title', label: 'Заголовок' },
        {
            key: 'category',
            label: 'Категорія',
            render: (val) => <StatusBadge tone="neutral" label={val} />,
        },
        {
            key: 'status',
            label: 'Статус',
            render: (val) => {
                const meta = STATUS_META[val] || STATUS_META.published;
                return <StatusBadge tone={meta.tone} label={meta.label} />;
            },
        },
        {
            key: 'date',
            label: 'Дата',
            render: (val) => <span className="mono">{fmtDate(val)}</span>,
        },
        {
            key: 'id',
            label: 'Дії',
            align: 'right',
            render: (_, post) => (
                <div className="blog-list-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        className="ds-icon-btn"
                        onClick={() => setDeleteTarget(post)}
                        title="Видалити"
                        aria-label={`Видалити статтю «${post.title}»`}
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            ),
        },
    ], []);

    return (
        <div>
            <PageHeader
                title="Блог"
                subtitle={`${filteredPosts.length} з ${posts.length} статей`}
                actions={(
                    <button type="button" className="ds-btn ds-btn--primary" onClick={() => navigate('/admin/blog/new')}>
                        <Plus size={16} /> Додати статтю
                    </button>
                )}
            />

            <Toolbar
                search={searchTerm}
                onSearch={(value) => updateParams({ q: value })}
                placeholder="Пошук за заголовком..."
                filters={[
                    { key: 'category', label: 'Всі категорії', value: categoryFilter, options: categoryOptions },
                    { key: 'status', label: 'Всі статуси', value: statusFilter, options: STATUS_OPTIONS },
                ]}
                onFilter={(key, value) => updateParams({ [key]: value })}
            />

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
