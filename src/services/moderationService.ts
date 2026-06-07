import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS } from '../constants';
import {
  ApiResponse,
  ModerationAction,
  ModerationActionFormData,
  UserModerationState,
  UserModerationStatus,
} from '../types';
import { logServiceError } from '../utils/error';

const getStatusForAction = (action: ModerationActionFormData['action']): UserModerationStatus => {
  switch (action) {
    case 'warn':
      return 'warned';
    case 'mute':
      return 'muted';
    case 'suspend':
      return 'suspended';
    case 'lift':
      return 'active';
    default:
      return 'active';
  }
};

const getMuteExpiration = (durationMinutes?: number): Date | null => {
  if (!durationMinutes || durationMinutes <= 0) {
    return null;
  }

  return new Date(Date.now() + durationMinutes * 60 * 1000);
};

export const applyModerationAction = async (
  moderatorId: string,
  formData: ModerationActionFormData
): Promise<ApiResponse<{ action: ModerationAction; state: UserModerationState }>> => {
  try {
    if (!formData.targetUserId || formData.targetUserId === moderatorId) {
      return {
        success: false,
        error: 'Choose a valid user for this action.',
      };
    }

    if (!formData.reason.trim()) {
      return {
        success: false,
        error: 'Add a reason for the moderation action.',
      };
    }

    const actionRef = doc(collection(db, COLLECTIONS.MODERATION_ACTIONS));
    const stateRef = doc(db, COLLECTIONS.USER_MODERATION, formData.targetUserId);
    const expiresAt = formData.action === 'mute' ? getMuteExpiration(formData.durationMinutes) : null;
    const status = getStatusForAction(formData.action);
    const reason = formData.reason.trim().slice(0, 2000);
    const batch = writeBatch(db);

    const actionData = {
      targetUserId: formData.targetUserId,
      moderatorId,
      action: formData.action,
      reason,
      reportId: formData.reportId || null,
      durationMinutes: formData.durationMinutes || null,
      expiresAt,
      createdAt: serverTimestamp(),
    };

    const stateData = {
      userId: formData.targetUserId,
      status,
      reason,
      mutedUntil: expiresAt,
      updatedAt: serverTimestamp(),
      updatedBy: moderatorId,
      lastActionId: actionRef.id,
    };

    batch.set(actionRef, actionData);
    batch.set(stateRef, stateData, { merge: true });
    await batch.commit();

    return {
      success: true,
      data: {
        action: {
          id: actionRef.id,
          ...actionData,
          reportId: actionData.reportId || undefined,
          durationMinutes: actionData.durationMinutes || undefined,
          createdAt: new Date(),
        } as ModerationAction,
        state: {
          ...stateData,
          updatedAt: new Date(),
        } as UserModerationState,
      },
      message: 'Moderation action applied',
    };
  } catch (error) {
    logServiceError('ModerationService.applyModerationAction', error);
    return {
      success: false,
      error: 'Failed to apply moderation action',
    };
  }
};
