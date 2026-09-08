import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Tabs from '../ui/Tabs';
import './section-tabs-layout.css';

/**
 * Shared tab shell for the flat sections in the new admin nav
 * (docs/admin-redesign/00-plan.md, "Нова структура розділів"). Each tab is a
 * real route under `basePath`, so the active tab follows the URL instead of
 * query state — bookmarks and back/forward keep working.
 *
 * Props:
 *   basePath – section root, e.g. '/admin/stock'
 *   tabs     – array of { value, label } — value '' means the section index route
 */
export default function SectionTabsLayout({ basePath, tabs }) {
    const location = useLocation();
    const navigate = useNavigate();

    const relative = location.pathname === basePath
        ? ''
        : location.pathname.slice(basePath.length).replace(/^\//, '');
    const activeTab = tabs.some((t) => t.value === relative) ? relative : tabs[0]?.value ?? '';

    return (
        <div className="section-tabs-layout">
            <Tabs
                tabs={tabs}
                value={activeTab}
                onChange={(value) => navigate(value ? `${basePath}/${value}` : basePath)}
            />
            <div className="section-tabs-layout-body">
                <Outlet />
            </div>
        </div>
    );
}
