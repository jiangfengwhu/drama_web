import { useCallback, useState } from 'react';
import {
  INITIAL_ADMISSION_TICKETS,
  STORAGE_KEYS,
  TICKET_PACK_SIZE,
} from '../constants/game.const';

function readTickets(): number {
  const stored = localStorage.getItem(STORAGE_KEYS.admissionTickets);
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return INITIAL_ADMISSION_TICKETS;
}

export function useAdmissionTicket() {
  const [tickets, setTicketsState] = useState(readTickets);

  const persist = useCallback((next: number) => {
    const value = Math.max(0, next);
    localStorage.setItem(STORAGE_KEYS.admissionTickets, String(value));
    setTicketsState(value);
    return value;
  }, []);

  const consumeTicket = useCallback((): boolean => {
    if (tickets <= 0) return false;
    persist(tickets - 1);
    return true;
  }, [tickets, persist]);

  const purchaseTicketPack = useCallback(() => {
    persist(tickets + TICKET_PACK_SIZE);
  }, [tickets, persist]);

  return {
    tickets,
    hasTicket: tickets > 0,
    consumeTicket,
    purchaseTicketPack,
  };
}
