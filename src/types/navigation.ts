import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  // Auth
  Login: undefined;
  MemberActivation: undefined;

  // Main
  Home: undefined;
  AdminDashboard: undefined;

  // Report
  ReportList: undefined;
  ReportDetail: { reportId: string };
  ReportCreate: undefined;
  ReportPreview: { reportId: string };
  ReportPdfViewer: { reportId: string };

  // Access Denied
  AccessDenied: { reason?: string };

  // Common
  NotFound: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
