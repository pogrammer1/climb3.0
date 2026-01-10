// Cross-platform alert utility
import { Alert, Platform } from 'react-native';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

/**
 * Show a cross-platform alert that works on both web and mobile
 */
export const showAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => {
  if (Platform.OS === 'web') {
    // On web, use browser's native dialogs
    if (buttons && buttons.length > 1) {
      // If we have multiple buttons, use confirm dialog
      const confirmed = window.confirm(`${title}\n\n${message || ''}`);
      if (confirmed) {
        // Find the non-cancel button and call its onPress
        const confirmButton = buttons.find(b => b.style !== 'cancel');
        confirmButton?.onPress?.();
      } else {
        // Find the cancel button and call its onPress
        const cancelButton = buttons.find(b => b.style === 'cancel');
        cancelButton?.onPress?.();
      }
    } else {
      // Single button or no buttons, just show alert
      window.alert(`${title}\n\n${message || ''}`);
      buttons?.[0]?.onPress?.();
    }
  } else {
    // On mobile, use native Alert
    Alert.alert(title, message, buttons);
  }
};

/**
 * Show a confirmation dialog that works on both web and mobile
 * Returns a promise that resolves to true if confirmed, false if cancelled
 */
export const showConfirm = (title: string, message?: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`${title}\n\n${message || ''}`);
      resolve(confirmed);
    } else {
      Alert.alert(
        title,
        message,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'OK', onPress: () => resolve(true) },
        ]
      );
    }
  });
};
