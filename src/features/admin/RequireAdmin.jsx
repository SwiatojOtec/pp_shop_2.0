import { useAuth } from '../../context/AuthContext';
import AdminLogin from '../../pages/admin/AdminLogin';

export default function RequireAdmin({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="admin-loading-screen">Перевірка доступу...</div>;
    }

    if (!user) {
        return <AdminLogin />;
    }

    return children;
}
