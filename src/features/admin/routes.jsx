import { Routes, Route, Navigate } from 'react-router-dom';

import AdminLogin from '../../pages/admin/AdminLogin';
import AdminRegister from '../../pages/admin/AdminRegister';
import AdminLayout from '../../pages/admin/AdminLayout';
import AdminDashboard from '../../pages/admin/AdminDashboard';
import AdminProfile from '../../pages/admin/AdminProfile';
import AdminClients from '../../pages/admin/AdminClients';
import AdminClientDetails from '../../pages/admin/AdminClientDetails';
import StockPositions from './stock/pages/StockPositions';
import StockEvents from './stock/pages/StockEvents';
import AdminRent from '../../pages/admin/AdminRent';
import AdminProducts from '../../pages/admin/AdminProducts';
import ProductEdit from '../../pages/admin/ProductEdit';
import AdminCategories from '../../pages/admin/AdminCategories';
import AdminBlog from '../../pages/admin/AdminBlog';
import AdminBlogEdit from '../../pages/admin/AdminBlogEdit';
import PanPivdenbud from '../../pages/admin/PanPivdenbud';
import AdminUsers from '../../pages/admin/AdminUsers';
import AdminSubdivisions from '../../pages/admin/AdminSubdivisions';

import OrdersRentalList from '../orders-rental/pages/OrdersRentalList';
import RentalCalendar from '../orders-rental/pages/RentalCalendar';
import DealWorkspace from '../orders-rental/pages/DealWorkspace';
import AdminRentalApplicationForm from '../orders-rental/pages/AdminRentalApplicationForm';

import RequireAdmin from './RequireAdmin';
import SectionTabsLayout from './sections/SectionTabsLayout';
import StockWarehouses from './sections/StockWarehouses';
import CompanyLegalEntitiesPlaceholder from './sections/CompanyLegalEntitiesPlaceholder';
import LegacyRedirect, { IdLegacyRedirect } from './sections/LegacyRedirect';
import DealsLegacyRedirect from './sections/DealsLegacyRedirect';
import UiSandbox from './dev/UiSandbox';

const STOCK_TABS = [
    { value: '', label: 'Залишки' },
    { value: 'log', label: 'Журнал' },
    { value: 'warehouses', label: 'Склади' },
];

const CATALOG_TABS = [
    { value: 'tools', label: 'Інструмент' },
    { value: 'goods', label: 'Товари' },
    { value: 'taxonomy', label: 'Категорії та бренди' },
];

const COMPANY_TABS = [
    { value: 'users', label: 'Користувачі' },
    { value: 'subdivisions', label: 'Підрозділи' },
    { value: 'legal-entities', label: 'Юрособи' },
];

/**
 * The admin route tree (docs/admin-redesign/00-plan.md, крок 2). Mounted at
 * /admin/* from src/App.jsx so App.jsx stays a list of top-level sections
 * instead of a sheet of every admin screen.
 *
 * Old URLs are kept alive as redirects, declared after the routes they point
 * to, matching the "Таблиця відповідності маршрутів" in the plan.
 */
export default function AdminRoutes() {
    return (
        <Routes>
            <Route path="login" element={<AdminLogin />} />
            <Route path="register" element={<AdminRegister />} />

            {/* Design-system component gallery — not linked from any nav */}
            <Route path="_dev/ui-sandbox" element={<UiSandbox />} />

            <Route
                element={(
                    <RequireAdmin>
                        <AdminLayout />
                    </RequireAdmin>
                )}
            >
                <Route index element={<AdminDashboard />} />
                <Route path="profile" element={<AdminProfile />} />

                <Route path="deals" element={<OrdersRentalList />} />
                <Route path="deals/calendar" element={<RentalCalendar />} />
                <Route path="deals/:id" element={<DealWorkspace />} />

                <Route path="clients" element={<AdminClients />} />
                <Route path="clients/:id" element={<AdminClientDetails />} />

                <Route path="stock" element={<SectionTabsLayout basePath="/admin/stock" tabs={STOCK_TABS} />}>
                    <Route index element={<StockPositions />} />
                    <Route path="log" element={<StockEvents />} />
                    <Route path="warehouses" element={<StockWarehouses />} />
                </Route>

                <Route path="catalog" element={<SectionTabsLayout basePath="/admin/catalog" tabs={CATALOG_TABS} />}>
                    <Route index element={<Navigate to="/admin/catalog/tools" replace />} />
                    <Route path="tools" element={<AdminRent />} />
                    <Route path="goods" element={<AdminProducts />} />
                    <Route path="taxonomy" element={<AdminCategories />} />
                </Route>
                <Route path="catalog/tools/:id" element={<ProductEdit context="rent" />} />
                <Route path="catalog/goods/:id" element={<ProductEdit />} />

                <Route path="blog" element={<AdminBlog />} />
                <Route path="blog/:id" element={<AdminBlogEdit />} />

                <Route path="timesheet" element={<PanPivdenbud />} />

                <Route path="company" element={<SectionTabsLayout basePath="/admin/company" tabs={COMPANY_TABS} />}>
                    <Route index element={<Navigate to="/admin/company/users" replace />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="subdivisions" element={<AdminSubdivisions />} />
                    <Route path="legal-entities" element={<CompanyLegalEntitiesPlaceholder />} />
                </Route>

                {/*
                    /admin/rental-applications/:id stays live (not redirected): it
                    addresses a RentalApplication id, while /admin/deals/:id addresses
                    an Order id — different id spaces. Folding it into the deal
                    workspace is screen-level work for the "Угода" phase, not a routes-
                    only rename.
                */}
                <Route path="rental-applications/:id" element={<AdminRentalApplicationForm />} />

                {/* Legacy redirects — keep old bookmarks and links alive */}
                <Route path="orders" element={<DealsLegacyRedirect />} />
                <Route path="orders/:id" element={<IdLegacyRedirect toBase="/admin/deals" />} />
                <Route path="rental-applications" element={<LegacyRedirect to="/admin/deals" extra={{ type: 'rent' }} />} />
                <Route path="rental-applications/new" element={<LegacyRedirect to="/admin/deals" />} />

                <Route path="warehouses" element={<LegacyRedirect to="/admin/stock" />} />
                <Route path="warehouses/positions" element={<LegacyRedirect to="/admin/stock" />} />
                <Route path="warehouses/events" element={<LegacyRedirect to="/admin/stock/log" />} />

                <Route path="rent" element={<LegacyRedirect to="/admin/catalog/tools" />} />
                <Route path="rent/:id" element={<IdLegacyRedirect toBase="/admin/catalog/tools" />} />
                <Route path="products" element={<LegacyRedirect to="/admin/catalog/goods" />} />
                <Route path="products/:id" element={<IdLegacyRedirect toBase="/admin/catalog/goods" />} />
                <Route path="settings" element={<LegacyRedirect to="/admin/catalog/taxonomy" />} />

                <Route path="users" element={<LegacyRedirect to="/admin/company/users" />} />
                <Route path="subdivisions" element={<LegacyRedirect to="/admin/company/subdivisions" />} />

                <Route path="pan-pivdenbud" element={<LegacyRedirect to="/admin/timesheet" />} />

                {/* /admin/admin never had a working nav link; its only real content
                    (the warehouse deletion queue) now lives at /admin/stock/warehouses */}
                <Route path="admin" element={<LegacyRedirect to="/admin/stock/warehouses" />} />
                <Route path="admin/settings" element={<LegacyRedirect to="/admin/catalog/taxonomy" />} />
                <Route path="admin/users" element={<LegacyRedirect to="/admin/company/users" />} />
            </Route>

            <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
    );
}
