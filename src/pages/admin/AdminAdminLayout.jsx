import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import './Admin.css';

export default function AdminAdminLayout() {
    return (
        <div className="admin-warehouse-shell">
            <nav className="admin-warehouse-subnav" aria-label="Розділи адмінки">
                <NavLink
                    end
                    to="/admin/admin"
                    className={({ isActive }) => `admin-warehouse-subnav__link${isActive ? ' is-active' : ''}`}
                >
                    Головна
                </NavLink>
                <NavLink
                    to="/admin/admin/settings"
                    className={({ isActive }) => `admin-warehouse-subnav__link${isActive ? ' is-active' : ''}`}
                >
                    Налаштування
                </NavLink>
                <NavLink
                    to="/admin/admin/users"
                    className={({ isActive }) => `admin-warehouse-subnav__link${isActive ? ' is-active' : ''}`}
                >
                    Користувачі
                </NavLink>
            </nav>
            <Outlet />
        </div>
    );
}

