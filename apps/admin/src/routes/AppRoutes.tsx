import UsersListPage from "../pages/users/UsersListPage";
import DashboardLayout from "../layouts/DashboardLayout";
import DashboardPage from "../pages/dashboard/DashboardPage";
import { Route, Routes, Navigate } from "react-router-dom";

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<DashboardLayout />} >
                <Route index element={<DashboardPage />} />
                <Route path="users" element={<UsersListPage />} />
            </Route>
        </Routes>
    )
}