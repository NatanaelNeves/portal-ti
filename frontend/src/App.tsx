import './styles/App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';

// Public Pages
import HomePage from './pages/HomePage';
import OpenTicketPage from './pages/OpenTicketPage';
import MyTicketsPage from './pages/MyTicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';
import InformationCenterPage from './pages/InformationCenterPage';

// Internal Pages
import InternalLoginPage from './pages/InternalLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminTicketsPage from './pages/AdminTicketsPage';
import AdminTicketDetailPage from './pages/AdminTicketDetailPage';
import InventoryPage from './pages/InventoryPage';
import GestorDashboardPage from './pages/GestorDashboardPage';
import GestorTicketsPage from './pages/GestorTicketsPage';
import DashboardPage from './pages/DashboardPage';
import KnowledgeManagementPage from './pages/KnowledgeManagementPage';
import UsersManagementPage from './pages/UsersManagementPage';

// Inventory Module Pages
import InventoryDashboardPage from './pages/InventoryDashboardPage';
import ResponsibilitiesPage from './pages/ResponsibilitiesPage';
import EquipmentPage from './pages/EquipmentPage';
import PurchasesPage from './pages/PurchasesPage';
import EquipmentDetailPage from './pages/EquipmentDetailPage';
import SignTermPage from './pages/SignTermPage';
import ReturnTermPage from './pages/ReturnTermPage';
import CreateEquipmentPage from './pages/CreateEquipmentPage';
import ReceiveEquipmentPage from './pages/ReceiveEquipmentPage';

// Components
import Navigation from './components/Navigation';

function App() {
  const { loadStoredUser } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    loadStoredUser();
    const internalUser = localStorage.getItem('internal_user');
    if (internalUser) {
      try {
        const user = JSON.parse(internalUser);
        setUserRole(user.role);
      } catch (e) {
        console.error('Failed to parse internal_user');
      }
    }
    setIsReady(true);
  }, [loadStoredUser]);

  const isInternalUser = !!localStorage.getItem('internal_token');
  const isITStaff = userRole === 'it_staff';

  if (!isReady) {
    return <div>Carregando...</div>;
  }

  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="main-content">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/abrir-chamado" element={<OpenTicketPage />} />
            <Route path="/meus-chamados" element={<MyTicketsPage />} />
            <Route path="/chamado/:id" element={<TicketDetailPage />} />
            <Route path="/central" element={<InformationCenterPage />} />

            {/* Internal Login */}
            <Route path="/admin/login" element={<InternalLoginPage />} />

            {/* IT Staff Routes */}
            {isInternalUser && (
              <>
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/chamados" element={<AdminTicketsPage />} />
                <Route path="/admin/chamados/:id" element={<AdminTicketDetailPage />} />
                <Route path="/admin/conhecimento" element={<KnowledgeManagementPage />} />
                <Route path="/admin/usuarios" element={<UsersManagementPage />} />
                <Route path="/admin/estoque" element={<InventoryPage />} />
                <Route path="/admin/documentos" element={<DashboardPage />} />
                <Route path="/admin/relatorios" element={<DashboardPage />} />
              </>
            )}

            {/* Inventory Module Routes - IT Staff Only */}
            {isITStaff && (
              <>
                <Route path="/inventario" element={<InventoryDashboardPage />} />
                <Route path="/inventario/responsabilidades" element={<ResponsibilitiesPage />} />
                <Route path="/inventario/equipamentos" element={<EquipmentPage />} />
                <Route path="/inventario/equipamentos/novo" element={<CreateEquipmentPage />} />
                <Route path="/inventario/recebimento" element={<ReceiveEquipmentPage />} />
                <Route path="/inventario/compras" element={<PurchasesPage />} />
                <Route path="/inventario/equipamento/:equipmentId" element={<EquipmentDetailPage />} />
                <Route path="/inventario/equipamento/:equipmentId/assinar-termo" element={<SignTermPage />} />
                <Route path="/inventario/termo/:termId/devolucao" element={<ReturnTermPage />} />
              </>
            )}

            {/* Gestor/Manager Routes */}
            {isInternalUser && (
              <>
                <Route path="/gestor/dashboard" element={<GestorDashboardPage />} />
                <Route path="/gestor/solicitacoes" element={<GestorTicketsPage />} />
              </>
            )}

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
