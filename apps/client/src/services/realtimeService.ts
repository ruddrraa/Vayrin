import { supabase } from './supabaseBase';

export const realtimeService = {
  subscribeGlobalUpdates(params: {
    onAmbulances?: () => void;
    onDrivers?: () => void;
    onBloodStock?: () => void;
    onOrders?: () => void;
    onRideRequests?: (payload: any) => void;
  }): { unsubscribe: () => void } {
    const channel = supabase
      .channel('global_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ambulances' }, () => params.onAmbulances?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => params.onDrivers?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blood_stock' }, () => params.onBloodStock?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => params.onOrders?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, (payload) => params.onRideRequests?.(payload))
      .subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      },
    };
  },
};
