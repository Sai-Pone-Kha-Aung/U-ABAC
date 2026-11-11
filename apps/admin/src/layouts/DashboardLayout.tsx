import React from 'react'
import Sidebar from './components/Sidebar'
import { Outlet } from 'react-router-dom'

const DashboardLayout = () => {
    return (
        <div className='flex min-h-screen'>
            <Sidebar />
            <div className='flex-1'>
                <main>
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

export default DashboardLayout