import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLLECTIONS } from '../constants';
import { ApiResponse, ContentReport, ReportFormData, ReportReason } from '../types';
import { logServiceError } from '../utils/error';

const VALID_REPORT_REASONS: ReportReason[] = [
  'harassment',
  'hate_speech',
  'sexual_content',
  'spam',
  'impersonation',
  'safety_concern',
  'other',
];

const trimDetails = (details: string): string => details.trim().slice(0, 2000);
const trimPreview = (preview?: string): string | undefined => preview?.trim().slice(0, 280) || undefined;

export const submitReport = async (
  reporterId: string,
  reportData: ReportFormData
): Promise<ApiResponse<ContentReport>> => {
  try {
    if (!VALID_REPORT_REASONS.includes(reportData.reason)) {
      return {
        success: false,
        error: 'Choose a report reason.',
      };
    }

    if (reportData.targetType === 'user' && !reportData.reportedUserId) {
      return {
        success: false,
        error: 'Choose a climber to report.',
      };
    }

    if (reportData.targetType === 'message' && (!reportData.conversationId || !reportData.messageId)) {
      return {
        success: false,
        error: 'Choose a message to report.',
      };
    }

    const newReport = {
      reporterId,
      targetType: reportData.targetType,
      reason: reportData.reason,
      details: trimDetails(reportData.details),
      status: 'pending',
      reportedUserId: reportData.reportedUserId || null,
      conversationId: reportData.conversationId || null,
      messageId: reportData.messageId || null,
      messagePreview: trimPreview(reportData.messagePreview) || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.REPORTS), newReport);

    return {
      success: true,
      data: {
        id: docRef.id,
        ...newReport,
        reportedUserId: newReport.reportedUserId || undefined,
        conversationId: newReport.conversationId || undefined,
        messageId: newReport.messageId || undefined,
        messagePreview: newReport.messagePreview || undefined,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ContentReport,
      message: 'Report submitted',
    };
  } catch (error) {
    logServiceError('ReportService.submitReport', error);
    return {
      success: false,
      error: 'Failed to submit report',
    };
  }
};
