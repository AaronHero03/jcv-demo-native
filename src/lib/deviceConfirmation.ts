import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export async function confirmOnDevice(reason: string) {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    throw new Error('Abre la app en Android o iOS para confirmar con el bloqueo del dispositivo.');
  }
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason, cancelLabel: 'Cancelar', fallbackLabel: 'Usar código del dispositivo',
    disableDeviceFallback: false,
  });
  if (!result.success) throw new Error('No se confirmó la operación en el dispositivo.');
}
