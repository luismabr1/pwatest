import AdminLogin from "@/components/admin/admin-login"

export default function AdminPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Acceso Personal</h1>
          <p className="text-lg text-gray-600">Sistema de Administración</p>
        </div>

        <AdminLogin />

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Sistema de Estacionamiento - Panel Administrativo</p>
        </div>
      </div>
    </main>
  )
}
