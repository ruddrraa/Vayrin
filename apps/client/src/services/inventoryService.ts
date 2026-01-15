import { assertNoError, supabase } from './supabaseBase';
import type {
  BloodBankDetails,
  BloodInventory,
  BloodComponent,
  BloodBatch,
  ComponentType,
  BloodGroup,
  ComponentTypeCode,
  BatchStatus,
} from '../../types';

// Helper to convert DB snake_case to camelCase
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj === null || typeof obj !== 'object') return obj;
  
  const newObj: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    newObj[camelKey] = toCamelCase(obj[key]);
  }
  return newObj;
};

// Helper to convert camelCase to snake_case for DB
const toSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj === null || typeof obj !== 'object') return obj;
  
  const newObj: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    newObj[snakeKey] = toSnakeCase(obj[key]);
  }
  return newObj;
};

export const inventoryService = {
  // ============ BLOOD BANK DETAILS ============
  async getBloodBankDetails(hospitalId: string): Promise<BloodBankDetails | null> {
    const { data, error } = await supabase
      .from('blood_bank_details')
      .select('*')
      .eq('hospital_id', hospitalId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      assertNoError(error, 'inventoryService.getBloodBankDetails');
    }
    return data ? toCamelCase(data) : null;
  },

  async createBloodBankDetails(params: {
    hospitalId: string;
    licenseNumber: string;
    bankType?: string;
  }): Promise<BloodBankDetails> {
    const { data, error } = await supabase
      .from('blood_bank_details')
      .insert(toSnakeCase(params))
      .select()
      .single();
    assertNoError(error, 'inventoryService.createBloodBankDetails');
    return toCamelCase(data);
  },

  async updateBloodBankDetails(id: string, params: Partial<BloodBankDetails>): Promise<BloodBankDetails> {
    const { data, error } = await supabase
      .from('blood_bank_details')
      .update({ ...toSnakeCase(params), last_updated: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    assertNoError(error, 'inventoryService.updateBloodBankDetails');
    return toCamelCase(data);
  },

  // ============ BLOOD INVENTORY (per blood group) ============
  async getInventory(bloodBankId: string): Promise<BloodInventory[]> {
    const { data, error } = await supabase
      .from('blood_inventory')
      .select(`
        *,
        components:blood_components(
          *,
          batches:blood_batches(*)
        )
      `)
      .eq('blood_bank_id', bloodBankId)
      .order('blood_group');
    
    assertNoError(error, 'inventoryService.getInventory');
    return toCamelCase(data ?? []);
  },

  async getAllAvailableInventory(): Promise<BloodInventory[]> {
    // Now blood_bank_details has hospital info directly - no need to join with profiles
    const { data, error } = await supabase
      .from('blood_inventory')
      .select(`
        *,
        blood_bank:blood_bank_details(
          id,
          hospital_id,
          license_number,
          bank_type,
          hospital_name,
          hospital_city,
          hospital_address,
          hospital_phone
        ),
        components:blood_components(
          *,
          batches:blood_batches(*)
        )
      `)
      .eq('is_active', true);
    
    console.log('=== inventoryService.getAllAvailableInventory ===');
    console.log('Raw blood_inventory count:', data?.length ?? 0);
    
    if (error) {
      console.error('getAllAvailableInventory error:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No blood_inventory records found! Hospitals need to add inventory first.');
      return [];
    }
    
    // Log raw data for debugging
    data.forEach((inv: any, idx: number) => {
      console.log(`Raw item ${idx}:`, {
        bloodGroup: inv.blood_group,
        bloodBankId: inv.blood_bank?.id,
        hospitalId: inv.blood_bank?.hospital_id,
        hospitalName: inv.blood_bank?.hospital_name,
        hospitalCity: inv.blood_bank?.hospital_city,
      });
    });
    
    // Convert to camelCase FIRST, then add hospital object
    const camelCaseData = toCamelCase(data);
    
    // Now add hospital object with correct keys (already camelCase)
    const inventoryWithHospitals = camelCaseData.map((inv: any) => {
      if (inv.bloodBank) {
        inv.bloodBank.hospital = {
          id: inv.bloodBank.hospitalId,
          name: inv.bloodBank.hospitalName,
          city: inv.bloodBank.hospitalCity,
          address: inv.bloodBank.hospitalAddress,
          phone: inv.bloodBank.hospitalPhone,
        };
        console.log('Added hospital object:', inv.bloodBank.hospital);
      }
      return inv;
    });
    
    console.log('Final inventory with hospitals:', inventoryWithHospitals);
    return inventoryWithHospitals;
  },

  async createInventory(params: {
    bloodBankId: string;
    bloodGroup: BloodGroup;
    rhFactor: '+' | '-';
  }): Promise<BloodInventory> {
    const { data, error } = await supabase
      .from('blood_inventory')
      .insert(toSnakeCase(params))
      .select()
      .single();
    assertNoError(error, 'inventoryService.createInventory');
    return toCamelCase(data);
  },

  async updateInventory(id: string, params: Partial<BloodInventory>): Promise<BloodInventory> {
    const { data, error } = await supabase
      .from('blood_inventory')
      .update(toSnakeCase(params))
      .eq('id', id)
      .select()
      .single();
    assertNoError(error, 'inventoryService.updateInventory');
    return toCamelCase(data);
  },

  async deleteInventory(id: string): Promise<void> {
    const { error } = await supabase
      .from('blood_inventory')
      .delete()
      .eq('id', id);
    assertNoError(error, 'inventoryService.deleteInventory');
  },

  // ============ BLOOD COMPONENTS ============
  async getComponents(inventoryId: string): Promise<BloodComponent[]> {
    const { data, error } = await supabase
      .from('blood_components')
      .select(`
        *,
        batches:blood_batches(*)
      `)
      .eq('inventory_id', inventoryId)
      .order('type_code');
    
    assertNoError(error, 'inventoryService.getComponents');
    return toCamelCase(data ?? []);
  },

  async createComponent(params: {
    inventoryId: string;
    typeCode: ComponentTypeCode;
    displayName: string;
    processingCharge: number;
    isGovtCapped?: boolean;
  }): Promise<BloodComponent> {
    const { data, error } = await supabase
      .from('blood_components')
      .insert(toSnakeCase(params))
      .select()
      .single();
    assertNoError(error, 'inventoryService.createComponent');
    return toCamelCase(data);
  },

  async updateComponent(id: string, params: Partial<BloodComponent>): Promise<BloodComponent> {
    const { data, error } = await supabase
      .from('blood_components')
      .update({ ...toSnakeCase(params), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    assertNoError(error, 'inventoryService.updateComponent');
    return toCamelCase(data);
  },

  async deleteComponent(id: string): Promise<void> {
    const { error } = await supabase
      .from('blood_components')
      .delete()
      .eq('id', id);
    assertNoError(error, 'inventoryService.deleteComponent');
  },

  // ============ BLOOD BATCHES ============
  async getBatches(componentId: string): Promise<BloodBatch[]> {
    const { data, error } = await supabase
      .from('blood_batches')
      .select('*')
      .eq('component_id', componentId)
      .order('expiry_date');
    
    assertNoError(error, 'inventoryService.getBatches');
    return toCamelCase(data ?? []);
  },

  async createBatch(params: {
    componentId: string;
    batchId: string;
    quantity: number;
    expiryDate: string;
    status?: BatchStatus;
    collectionDate?: string;
    donorId?: string;
    notes?: string;
  }): Promise<BloodBatch> {
    const { data, error } = await supabase
      .from('blood_batches')
      .insert(toSnakeCase(params))
      .select()
      .single();
    assertNoError(error, 'inventoryService.createBatch');
    return toCamelCase(data);
  },

  async updateBatch(id: string, params: Partial<BloodBatch>): Promise<BloodBatch> {
    const { data, error } = await supabase
      .from('blood_batches')
      .update({ ...toSnakeCase(params), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    assertNoError(error, 'inventoryService.updateBatch');
    return toCamelCase(data);
  },

  async deleteBatch(id: string): Promise<void> {
    const { error } = await supabase
      .from('blood_batches')
      .delete()
      .eq('id', id);
    assertNoError(error, 'inventoryService.deleteBatch');
  },

  async useBatch(id: string, unitsUsed: number): Promise<BloodBatch> {
    // First get current batch
    const { data: batch, error: fetchError } = await supabase
      .from('blood_batches')
      .select('*')
      .eq('id', id)
      .single();
    
    assertNoError(fetchError, 'inventoryService.useBatch.fetch');
    
    const newQuantity = batch.quantity - unitsUsed;
    
    if (newQuantity <= 0) {
      // Mark as used
      const { data, error } = await supabase
        .from('blood_batches')
        .update({ quantity: 0, status: 'USED', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      assertNoError(error, 'inventoryService.useBatch.markUsed');
      return toCamelCase(data);
    } else {
      // Reduce quantity
      const { data, error } = await supabase
        .from('blood_batches')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      assertNoError(error, 'inventoryService.useBatch.reduce');
      return toCamelCase(data);
    }
  },

  // ============ COMPONENT TYPES (Reference) ============
  async getComponentTypes(): Promise<ComponentType[]> {
    const { data, error } = await supabase
      .from('component_types')
      .select('*')
      .order('code');
    
    assertNoError(error, 'inventoryService.getComponentTypes');
    return toCamelCase(data ?? []);
  },

  // ============ UTILITY FUNCTIONS ============
  bloodGroupToDisplay(bloodGroup: BloodGroup): string {
    const map: Record<BloodGroup, string> = {
      'A_POSITIVE': 'A+',
      'A_NEGATIVE': 'A-',
      'B_POSITIVE': 'B+',
      'B_NEGATIVE': 'B-',
      'AB_POSITIVE': 'AB+',
      'AB_NEGATIVE': 'AB-',
      'O_POSITIVE': 'O+',
      'O_NEGATIVE': 'O-',
    };
    return map[bloodGroup] || bloodGroup;
  },

  displayToBloodGroup(display: string): BloodGroup {
    const map: Record<string, BloodGroup> = {
      'A+': 'A_POSITIVE',
      'A-': 'A_NEGATIVE',
      'B+': 'B_POSITIVE',
      'B-': 'B_NEGATIVE',
      'AB+': 'AB_POSITIVE',
      'AB-': 'AB_NEGATIVE',
      'O+': 'O_POSITIVE',
      'O-': 'O_NEGATIVE',
    };
    return map[display] || 'O_POSITIVE';
  },

  getStatusColor(status: BatchStatus): string {
    const colors: Record<BatchStatus, string> = {
      'FRESH': 'bg-emerald-100 text-emerald-700',
      'STABLE': 'bg-blue-100 text-blue-700',
      'NEAR_EXPIRY': 'bg-amber-100 text-amber-700',
      'CRITICAL_STOCK': 'bg-orange-100 text-orange-700',
      'URGENT_DISPOSAL': 'bg-rose-100 text-rose-700',
      'EXPIRED': 'bg-gray-100 text-gray-500 line-through',
      'USED': 'bg-slate-100 text-slate-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  },

  // ============ LEGACY SUPPORT ============
  // For backward compatibility with old BloodStock interface
  async fetchBloodStock() {
    const { data, error } = await supabase.from('blood_stock').select('*');
    if (error && error.code !== '42P01') { // Table doesn't exist
      assertNoError(error, 'inventoryService.fetchBloodStock');
    }
    return data ?? [];
  },

  async createBloodStock(params: {
    hospital_id: string;
    hospital_name: string;
    type: string;
    units: number;
    price: number;
    expiry_date: string;
    is_paused?: boolean;
  }) {
    const { data, error } = await supabase.from('blood_stock').insert(params).select().single();
    assertNoError(error, 'inventoryService.createBloodStock');
    return data;
  },

  async updateBloodStock(id: string, patch: Record<string, any>) {
    const { data, error } = await supabase.from('blood_stock').update(patch).eq('id', id).select().single();
    assertNoError(error, 'inventoryService.updateBloodStock');
    return data;
  },

  async deleteBloodStock(id: string): Promise<void> {
    const { error } = await supabase.from('blood_stock').delete().eq('id', id);
    assertNoError(error, 'inventoryService.deleteBloodStock');
  },

  // ============ REALTIME SUBSCRIPTIONS ============
  subscribeToInventory(bloodBankId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`inventory:${bloodBankId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blood_inventory', filter: `blood_bank_id=eq.${bloodBankId}` },
        callback
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blood_components' },
        callback
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blood_batches' },
        callback
      )
      .subscribe();
  },

  unsubscribeFromInventory(bloodBankId: string) {
    supabase.removeChannel(supabase.channel(`inventory:${bloodBankId}`));
  },
};

export default inventoryService;
