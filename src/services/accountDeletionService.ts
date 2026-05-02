import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export interface AccountDeletionResult {
  deleted: true;
  deletedPlans: number;
  deletedTimelines: number;
  scrubbedPlans: number;
  scrubbedTimelines: number;
}

export const deleteCurrentUserAccount = async (): Promise<AccountDeletionResult> => {
  const callable = httpsCallable<{ confirm: true }, AccountDeletionResult>(
    functions,
    'deleteCurrentUserAccount'
  );

  const result = await callable({ confirm: true });
  return result.data;
};
