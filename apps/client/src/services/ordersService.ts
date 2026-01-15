import { assertNoError, supabase } from './supabaseBase';

export const ordersService = {
  async fetchOrdersForUser(userId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    assertNoError(error, 'ordersService.fetchOrdersForUser');
    return data ?? [];
  },

  async fetchOrdersForHospital(hospitalId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false });
    assertNoError(error, 'ordersService.fetchOrdersForHospital');
    return data ?? [];
  },

  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    assertNoError(error, 'ordersService.updateOrderStatus');
  },

  async createOrder(params: { user_id: string; hospital_id: string; items: any; total_amount: number; status: string }) {
    const { data, error } = await supabase.from('orders').insert(params).select().single();
    assertNoError(error, 'ordersService.createOrder');
    return data;
  },
};
