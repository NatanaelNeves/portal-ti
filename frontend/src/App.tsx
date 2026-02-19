import './styles/App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { Toaster } from 'react-hot-toast';

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
import ReportsPage from './pages/ReportsPage';

// Inventory Module Pages
import InventoryDashboardPage from './pages/InventoryDashboardPage';
import ResponsibilitiesPage from './pages/ResponsibilitiesPage';
import EquipmentPage from './pages/EquipmentPage';
import NotebooksPage from './pages/NotebooksPage';
import PeripheralsPage from './pages/PeripheralsPage';
import PurchasesPage from './pages/PurchasesPage';
import EquipmentDetailPage from './pages/EquipmentDetailPage';
import SignTermPage from './pages/SignTermPage';
import ReturnTermPage from './pages/ReturnTermPage';
import CreateEquipmentPage from './pages/CreateEquipmentPage';
import ReceiveEquipmentPage from './pages/ReceiveEquipmentPage';
import CreatePurchasePage from './pages/CreatePurchasePage';
import DeliverEquipmentPage from './pages/DeliverEquipmentPage';
import ReturnEquipmentPage from './pages/ReturnEquipmentPage';
import MoveEquipmentPage from './pages/MoveEquipmentPage';

// Components
import Navigation from './components/Navigation';
import InternalProtectedRoute from './components/InternalProtectedRoute';
import ToastContainer from './components/ToastContainer';

function App() {
  const { loadStoredUser } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadStoredUser();
    setIsReady(true);
  }, [loadStoredUser]);

  if (!isReady) {
    return <div>Carregando...</div>;
  }

  return (
    <Router>
      <div className="app">
        <Toaster />
        <ToastContainer />
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
            <Route path="/admin/dashboard" element={<InternalProtectedRoute><AdminDashboardPage /></InternalProtectedRoute>} />
            <Route path="/admin/chamados" element={<InternalProtectedRoute><AdminTicketsPage /></InternalProtectedRoute>} />
            <Route path="/admin/chamados/:id" element={<InternalProtectedRoute><AdminTicketDetailPage /></InternalProtectedRoute>} />
            <Route path="/admin/conhecimento" element={<InternalProtectedRoute><KnowledgeManagementPage /></InternalProtectedRoute>} />
            <Route path="/admin/usuarios" element={<InternalProtectedRoute><UsersManagementPage /></InternalProtectedRoute>} />
            <Route path="/admin/estoque" element={<InternalProtectedRoute><InventoryPage /></InternalProtectedRoute>} />
            <Route path="/admin/documentos" element={<InternalProtectedRoute><DashboardPage /></InternalProtectedRoute>} />
            <Route path="/admin/relatorios" element={<InternalProtectedRoute><ReportsPage /></InternalProtectedRoute>} />

            {/* Inventory Module Routes - IT Staff Only */}
            <Route path="/inventario" element={<InternalProtectedRoute requireITStaff={true}><InventoryDashboardPage /></InternalProtectedRoute>} />
            <Route path="/inventario/responsabilidades" element={<InternalProtectedRoute requireITStaff={true}><ResponsibilitiesPage /></InternalProtectedRoute>} />
            <Route path="/inventario/equipamentos" element={<InternalProtectedRoute requireITStaff={true}><EquipmentPage /></InternalProtectedRoute>} />
            <Route path="/inventario/notebooks" element={<InternalProtectedRoute requireITStaff={true}><NotebooksPage /></InternalProtectedRoute>} />
            <Route path="/inventario/perifericos" element={<InternalProtectedRoute requireITStaff={true}><PeripheralsPage /></InternalProtectedRoute>} />
            <Route path="/inventario/equipamentos/novo" element={<InternalProtectedRoute requireITStaff={true}><CreateEquipmentPage /></InternalProtectedRoute>} />
            <Route path="/inventario/equipamentos/entregar" element={<InternalProtectedRoute requireITStaff={true}><DeliverEquipmentPage /></InternalProtectedRoute>} />
            <Route path="/inventario/equipamentos/devolver" element={<InternalProtectedRoute requireITStaff={true}><ReturnEquipmentPage /></InternalProtectedRoute>} />
            <Route path="/inventario/recebimento" element={<InternalProtectedRoute requireITStaff={true}><ReceiveEquipmentPage /></InternalProtectedRoute>} />
            <Route path="/inventario/compras" element={<InternalProtectedRoute requireITStaff={true}><PurchasesPage /></InternalProtectedRoute>} />
            <Route path="/inventario/compras/nova" element={<InternalProtectedRoute requireITStaff={true}><CreatePurchasePage /></InternalProtectedRoute>} />
            <Route path="/inventario/equipamento/:equipmentId" element={<InternalProtectedRoute requireITStaff={true}><EquipmentDetailPage /></InternalProtectedRoute>} />
            <Route path="/inventario/equipamento/:equipmentId/movimentar" element={<InternalProtectedRoute requireITStaff={true}><MoveEquipmentPage /></InternalProtectedRoute>} />
            <Route path="/inventario/equipamento/:equipmentId/assinar-termo" element={<InternalProtectedRoute requireITStaff={true}><SignTermPage /></InternalProtectedRoute>} />
            <Route path="/inventario/termo/:termId/devolucao" element={<InternalProtectedRoute requireITStaff={true}><ReturnTermPage /></InternalProtectedRoute>} />

            {/* Gestor/Manager Routes */}
            <Route path="/gestor/dashboard" element={<InternalProtectedRoute><GestorDashboardPage /></InternalProtectedRoute>} />
            <Route path="/gestor/solicitacoes" element={<InternalProtectedRoute><GestorTicketsPage /></InternalProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
