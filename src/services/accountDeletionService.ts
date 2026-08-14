import { supabase } from '../config/supabase';

export interface AccountDeletionResult {
  deleted: true;
  deletedPlans: number;
  deletedTimelines: number;
  scrubbedPlans: number;
  scrubbedTimelines: number;
}

export const deleteCurrentUserAccount = async (): Promise<AccountDeletionResult> => {
  const { data, error } = await supabase.rpc('delete_legacy_app_account', {
    p_confirm: true,
  });
  if (error) throw error;
  return data as AccountDeletionResult;
};
