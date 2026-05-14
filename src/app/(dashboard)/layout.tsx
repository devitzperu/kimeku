import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { DashboardTodosProvider } from "@/components/todos/dashboard-todos-provider"
import { DisableContextMenu } from "@/components/shared/disable-context-menu"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <DashboardTodosProvider>
      <DisableContextMenu />
      <div className="flex min-h-screen bg-bg">
        <Sidebar role={session.user.role} />
        <div className="flex flex-1 flex-col min-w-0">
          <Header session={session} />
          <main className="flex-1 px-4 py-6 md:px-8 md:py-10">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </DashboardTodosProvider>
  )
}
