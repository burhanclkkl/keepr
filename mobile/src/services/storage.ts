import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'keepr_auth_token';
const REFRESH_TOKEN_KEY = 'keepr_auth_refresh_token';

export const saveToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving auth token:', error);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error reading auth token:', error);
    return null;
  }
};

export const deleteToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error deleting auth token:', error);
  }
};

export const saveRefreshToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving refresh token:', error);
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error reading refresh token:', error);
    return null;
  }
};

export const deleteRefreshToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error deleting refresh token:', error);
  }
};

const PENDING_INVITE_KEY = 'keepr_pending_invite_token';

export const savePendingInviteToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(PENDING_INVITE_KEY, token);
  } catch (error) {
    console.error('Error saving pending invite token:', error);
  }
};

export const getPendingInviteToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(PENDING_INVITE_KEY);
  } catch (error) {
    console.error('Error reading pending invite token:', error);
    return null;
  }
};

export const deletePendingInviteToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(PENDING_INVITE_KEY);
  } catch (error) {
    console.error('Error deleting pending invite token:', error);
  }
};
