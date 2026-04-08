import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import './Admin.css';

export default function AdminWarehouseLayout() {
    return (
        <div className="admin-warehouse-shell">
            <nav className="admin-warehouse-subnav" aria-label="Розділи складу">
                <NavLink
                    end
                    to="/admin/warehouses"
                    className={({ isActive }) => `admin-warehouse-subnav__link${isActive ? ' is-active' : ''}`}
                >
                    Головна
                </NavLink>
                <NavLink
                    to="/admin/warehouses/positions"
                    className={({ isActive }) => `admin-warehouse-subnav__link${isActive ? ' is-active' : ''}`}
                >
                    Склади
                </NavLink>
                <NavLink
                    to="/admin/warehouses/events"
                    className={({ isActive }) => `admin-warehouse-subnav__link${isActive ? ' is-active' : ''}`}
                >
                    Події
                </NavLink>
            </nav>
            <Outlet />
        </div>
    );
}
