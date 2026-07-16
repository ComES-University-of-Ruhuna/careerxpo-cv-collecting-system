import Constants from 'expo-constants';

const extra = Constants?.expoConfig?.extra || {};

export const API_BASE_URL = extra.apiBaseUrl || 'https://careerxpo.comesuor.lk';

export const GOOGLE_CLIENT_IDS = {
  web: extra.googleWebClientId || '',
  ios: extra.googleIosClientId || '',
  android: extra.googleAndroidClientId || '',
};

export const BANK_DETAILS = {
  bankName: 'Bank of Ceylon',
  branch: 'Galle Fort',
  accountName: 'CAREER GUIDANCE STUDENTS SOCIETY',
  accountNumber: '90179141',
};

export const REGISTRATION_FEE_LKR = 500;
