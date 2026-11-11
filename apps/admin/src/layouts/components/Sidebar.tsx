import { LogOut } from 'lucide-react'
import { NavLink } from 'react-router-dom'

interface NavItem {
    label: string
    path: string
    count?: number
}

const primaryNavItems: NavItem[] = [
    { label: "Overview", path: "/" },
    { label: "Moderation", path: "/moderation" },
    { label: "Shop approvals", path: "/shop" },
    { label: "Users", path: "/users" },
    { label: "Settings", path: "/settings" },
]

const secondaryNavItems: NavItem[] = [
    { label: "Activity log", path: "/activity-log" },
]

const getNavLinkClassName = ({ isActive }: { isActive: boolean }) =>
    [
        "flex items-center justify-between w-full min-h-11 px-4 py-3 rounded-xl text-body transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface",
        isActive
            ? "bg-surface/15 text-surface font-semibold"
            : "text-surface/90 font-normal hover:bg-surface/10 hover:text-surface",
    ].join(" ")

const Sidebar = () => {
    return (
        <aside className="flex flex-col justify-between bg-primary w-64 border-r border-border min-h-screen shrink-0 px-4 py-8">
            <div className="flex flex-col w-full">
                <div className="px-4 mb-10">
                    <h1 className="text-heading text-surface font-bold tracking-tight">U-ABAC</h1>
                    <p className="text-small text-surface/75 mt-2">Admin Dashboard</p>
                </div>

                <nav aria-label="Primary" className="w-full">
                    <ul className="flex flex-col gap-2">
                        {primaryNavItems.map((item) => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    end={item.path === "/"}
                                    className={getNavLinkClassName}
                                >
                                    <span>{item.label}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>

                    <ul className="flex flex-col gap-2 mt-6">
                        {secondaryNavItems.map((item) => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    className={getNavLinkClassName}
                                >
                                    <span>{item.label}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>

            <div className="mt-auto pt-6 w-full">
                <button
                    type="button"
                    className="w-full flex items-center gap-2.5 min-h-11 px-4 py-3 font-medium text-surface/90 hover:bg-surface/10 hover:text-surface rounded-xl transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface"
                >
                    <LogOut size={18} aria-hidden="true" />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    )
}

export default Sidebar