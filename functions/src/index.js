import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  assertDeleteAccountRequest,
  cleanupCurrentUserAccount,
} from './accountDeletion.js';

initializeApp();

export const deleteCurrentUserAccount = onCall(async (request) => {
  const uid = assertDeleteAccountRequest(request, HttpsError);

  try {
    return await cleanupCurrentUserAccount({
      auth: getAuth(),
      database: getDatabase(),
    }, uid);
  } catch (error) {
    console.error('[deleteCurrentUserAccount] Account deletion failed:', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      'Account deletion failed before your account was removed. Please try again.'
    );
  }
});
