import './styles/App.css';
import './styles/PublicShell.css';
import './styles/RhShell.css';
import './styles/TiShell.css';
import './styles/TiPages.css';
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
import AdminStaffDashboardPage from './pages/AdminStaffDashboardPage';
import AdminTicketsPage from './pages/AdminTicketsPage';
import AdminTicketDetailPage from './pages/AdminTicketDetailPage';
import InventoryPage from './pages/InventoryPage';
import GestorDashboardPage from './pages/GestorDashboardPage';
import GestorTicketsPage from './pages/GestorTicketsPage';
import DocumentsPage from './pages/DocumentsPage';
import KnowledgeManagementPage from './pages/KnowledgeManagementPage';
import UsersManagementPage from './pages/UsersManagementPage';
import ReportsPage from './pages/ReportsPage';
import AuxAdminReportsPage from './pages/AuxAdminReportsPage';
import AdmTicketsPage from './pages/AdmTicketsPage';

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


// RH Module Pages
import RhDashboardPage from './pages/RhDashboardPage';
import RhTicketsPage from './pages/RhTicketsPage';
import RhReportsPage from './pages/RhReportsPage';
import RhTicketDetailPage from './pages/RhTicketDetailPage';

// Error pages
import NotFoundPage from './pages/NotFoundPage';
import StatusPage from './pages/StatusPage';

// Components
import Navigation from './components/Navigation';
import InternalProtectedRoute from './components/InternalProtectedRoute';
import { NotificationProvider } from './contexts/NotificationContext';
import './styles/AdminExperience.css';
import './styles/AdminReferenceRedesign.css';
import './styles/AdminUnifiedPages.css';
import './styles/AdminPaletteBridge.css';
import './styles/AdminSectorScreens.css';
import './styles/AdminTicketsRefinement.css';
import './styles/TicketsWorkspace.css';
import './styles/TicketsSkin.css';
import './styles/InventorySkin.css';

/**
 * Escolhe o relatorio conforme o perfil. A protecao real esta no backend
 * (`GET /reports/auxadmin` recusa TI e RH; os endpoints da TI mantem o proprio
 * gate) — aqui e so a experiencia certa para cada um.
 */
function ReportsRouter() {
  const stored = localStorage.getItem('internal_user');
  let role = '';
  try { role = stored ? JSON.parse(stored).role || '' : ''; } catch { role = ''; }
  return role === 'admin_staff' ? <AuxAdminReportsPage /> : <ReportsPage />;
}

/** Pedidos: o Administrativo tem sua própria tela; TI e admin seguem na fila completa. */
function TicketsRouter() {
  const stored = localStorage.getItem('internal_user');
  let role = '';
  try { role = stored ? JSON.parse(stored).role || '' : ''; } catch { role = ''; }
  return role === 'admin_staff' ? <AdmTicketsPage /> : <AdminTicketsPage />;
}

function App() {
  const { loadStoredUser } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadStoredUser();
    setIsReady(true);
  }, [loadStoredUser]);

  if (!isReady) {
    return (
      <div className="app-loading">
        <div className="app-loading__spinner" />
        <span className="app-loading__text">Carregando...</span>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <Router>
        <div className="app">
          <Toaster />
          <Navigation />
          <main className="main-content">
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/abrir-chamado" element={<OpenTicketPage />} />
            <Route path="/meus-chamados" element={<MyTicketsPage />} />
            <Route path="/chamado/:id" element={<TicketDetailPage />} />
            <Route path="/central" element={<InformationCenterPage />} />
            <Route path="/status" element={<StatusPage />} />
            {/* Reservas de notebook foram descontinuadas: links antigos voltam ao início. */}
            <Route path="/reservar/*" element={<Navigate to="/" replace />} />

   {/* Internal Login */}
            <Route path="/admin/login" element={<InternalLoginPage />} />

            {/* IT Staff Routes */}
            <Route path="/admin/dashboard" element={<InternalProtectedRoute allowedRoles={['admin', 'it_staff']}><AdminDashboardPage /></InternalProtectedRoute>} />
            <Route path="/admin/auxiliar/dashboard" element={<InternalProtectedRoute allowedRoles={['admin_staff']}><AdminStaffDashboardPage /></InternalProtectedRoute>} />
            <Route path="/admin/chamados" element={<InternalProtectedRoute allowedRoles={['admin', 'it_staff', 'admin_staff']}><TicketsRouter /></InternalProtectedRoute>} />
            <Route path="/admin/chamados/:id" element={<InternalProtectedRoute allowedRoles={['admin', 'it_staff', 'admin_staff']}><AdminTicketDetailPage /></InternalProtectedRoute>} />
            <Route path="/admin/conhecimento" element={<InternalProtectedRoute allowedRoles={['admin', 'it_staff']}><KnowledgeManagementPage /></InternalProtectedRoute>} />
            <Route path="/admin/usuarios" element={<InternalProtectedRoute allowedRoles={['admin', 'it_staff']}><UsersManagementPage /></InternalProtectedRoute>} />
            <Route path="/admin/estoque" element={<InternalProtectedRoute allowedRoles={['admin', 'it_staff']}><InventoryPage /></InternalProtectedRoute>} />
            <Route path="/admin/documentos" element={<InternalProtectedRoute allowedRoles={['admin', 'it_staff']}><DocumentsPage /></InternalProtectedRoute>} />
            {/* O auxiliar administrativo tem relatorio proprio: o da TI fala de
                infraestrutura e tecnicos, que nao descrevem o trabalho dele. */}
            <Route path="/admin/relatorios" element={
              <InternalProtectedRoute allowedRoles={['admin', 'it_staff', 'admin_staff', 'manager']}>
                <ReportsRouter />
              </InternalProtectedRoute>
            } />
            <Route path="/admin/kpis" element={<Navigate to="/admin/relatorios" replace />} />
            <Route path="/admin/recorrentes" element={<Navigate to="/admin/chamados" replace />} />

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
            <Route path="/inventario/compras/:id/editar" element={<InternalProtectedRoute requireITStaff={true}><CreatePurchasePage /></InternalProtectedRoute>} />
            <Route path="/inventario/equipamento/:equipmentId" element={<InternalProtectedRoute requireITStaff={true}><EquipmentDetailPage /></InternalProtectedRoute>} />
            <Route path="/inventario/equipamento/:equipmentId/movimentar" element={<InternalProtectedRoute requireITStaff={true}><MoveEquipmentPage /></InternalProtectedRoute>} />
            <Route path="/inventario/equipamento/:equipmentId/assinar-termo" element={<InternalProtectedRoute requireITStaff={true}><SignTermPage /></InternalProtectedRoute>} />
            <Route path="/inventario/equipamento/:equipmentId/termo-de-devolucao" element={<InternalProtectedRoute requireITStaff={true}><ReturnTermPage /></InternalProtectedRoute>} />
            <Route path="/inventario/termo/:termId/devolucao" element={<InternalProtectedRoute requireITStaff={true}><ReturnTermPage /></InternalProtectedRoute>} />

            {/* Reservas descontinuadas: endereços antigos levam ao painel. */}
            <Route path="/reservas/*" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/reservas/*" element={<Navigate to="/admin/dashboard" replace />} />

            {/* RH Staff Routes */}
            <Route path="/rh/dashboard" element={<InternalProtectedRoute allowedRoles={['rh_staff', 'admin']}><RhDashboardPage /></InternalProtectedRoute>} />
            <Route path="/rh/chamados" element={<InternalProtectedRoute allowedRoles={['rh_staff', 'admin']}><RhTicketsPage /></InternalProtectedRoute>} />
            <Route path="/rh/chamados/:id" element={<InternalProtectedRoute allowedRoles={['rh_staff', 'admin']}><RhTicketDetailPage /></InternalProtectedRoute>} />
            <Route path="/rh/relatorios" element={<InternalProtectedRoute allowedRoles={['rh_staff', 'admin']}><RhReportsPage /></InternalProtectedRoute>} />

            {/* Gestor/Manager Routes */}
            <Route path="/gestor/dashboard" element={<InternalProtectedRoute allowedRoles={['manager', 'admin']}><GestorDashboardPage /></InternalProtectedRoute>} />
            <Route path="/gestor/solicitacoes" element={<InternalProtectedRoute allowedRoles={['manager', 'admin']}><GestorTicketsPage /></InternalProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  </NotificationProvider>
  );
}

export default App;
