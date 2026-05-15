import { UserRole } from '../types/enums';
import { getCategorySector } from '../config/ticketCategories';

type TicketContext = {
  category?: string | null;
  department?: string | null;
};

const isManagerRole = (role: string) => role === UserRole.MANAGER || role === 'gestor';

export const isRhTicket = (ticket: TicketContext): boolean => {
  return getCategorySector(ticket.category, ticket.department) === 'RH';
};

export const canUserListTicket = (role: string, ticket: TicketContext): boolean => {
  if (role === UserRole.ADMIN) return true;

  if (role === UserRole.RH_STAFF) {
    return isRhTicket(ticket);
  }

  if ([UserRole.IT_STAFF, UserRole.ADMIN_STAFF].includes(role as UserRole) || isManagerRole(role)) {
    return !isRhTicket(ticket);
  }

  return false;
};

export const canUserViewTicketDetails = (role: string, ticket: TicketContext): boolean => {
  // Detail visibility mirrors list visibility for now, with extra checks in routes.
  return canUserListTicket(role, ticket);
};

export const canUserReceiveNotification = (role: string, ticket: TicketContext): boolean => {
  return canUserListTicket(role, ticket);
};
