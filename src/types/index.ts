export type RootStackParamList = {
  // Auth
  Splash: undefined;
  Login: undefined;
  AdminLogin: undefined;
  MemberActivation: undefined;
  SetPassword: { phone: string };

  // Admin
  AdminDashboard: undefined;
  AdminMembers: undefined;
  AdminAddMember: undefined;
  AdminPosts: undefined;
  AdminReports: undefined;
  AdminAnnouncements: undefined;
  AdminAddAnnouncement: { announcementId?: string };
  AdminNotifications: undefined;

  // User Tabs
  UserTabs: undefined;

  // Home Stack
  Home: undefined;
  Announcements: undefined;
  Notifications: undefined;

  // Feed Stack
  Feed: undefined;
  CreatePost: undefined;
  PostDetail: { postId: string };

  // Report Stack
  ReportList: undefined;
  ReportCreate: { reportId?: string };
  ReportDetail: { reportId: string };
  ReportPreview: { reportId: string };
  ReportPdfViewer: { reportId: string };

  // Chat Stack
  ChatList: undefined;
  ChatRoom: { conversationId: string; otherUserName: string; otherUserId: string };
  NewChat: undefined;

  // Profile Stack
  Profile: undefined;
  EditProfile: undefined;

  // Shared
  AccessDenied: undefined;
};

export type UserTabParamList = {
  HomeTab: undefined;
  FeedTab: undefined;
  ReportTab: undefined;
  ChatTab: undefined;
  ProfileTab: undefined;
};

export type MemberStatus = 'pending' | 'active' | 'blocked';
export type RegistrationStatus = MemberStatus;
export type PositionType = 'leadership' | 'pokja';
export type ReportStatus = 'sent';
export type MediaType = 'image' | 'video';
export type RecipientType = 'admin' | 'ketua' | 'wakil_ketua';
export type NotificationKind = 'chat_message' | 'report_received' | 'announcement' | 'social_activity' | 'system';
export type ProfileRole = 'admin' | 'user';

export interface Profile {
  id: string;
  name: string;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: string;
  code: string;
  name: string;
  type: PositionType;
  sort_order: number;
  created_at: string;
}

export interface Member {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  position_id: string;
  address: string | null;
  avatar_url: string | null;
  registration_status: MemberStatus;
  created_at: string;
  updated_at: string;
  position?: Position;
}

export interface Announcement {
  id: string;
  title: string | null;
  message: string;
  created_by: string | null;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  display_duration_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  likes_count?: number;
  comments_count?: number;
  saves_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
  media?: PostMedia[];
  user?: { name?: string };
}

export interface PostMedia {
  id: string;
  post_id: string;
  media_type: MediaType;
  storage_path: string;
  media_order: number;
  duration_seconds: number | null;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  user?: { name?: string };
  replies?: PostComment[];
}

export interface Report {
  id: string;
  created_by: string;
  creator_name: string;
  creator_position: string;
  chairperson_name: string;
  activity_basis: string;
  activity_date: string;
  activity_time: string;
  activity_place: string;
  activity_name: string;
  participants: string;
  activity_description: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  media?: ReportMedia[];
  recipients?: ReportRecipient[];
}

export interface ReportMedia {
  id: string;
  report_id: string;
  storage_path: string;
  media_order: number;
  crop_x: number | null;
  crop_y: number | null;
  crop_width: number | null;
  crop_height: number | null;
  created_at: string;
}

export interface ReportRecipient {
  id: string;
  report_id: string;
  recipient_user_id: string;
  recipient_type: RecipientType;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  direct_key: string;
  created_by: string;
  created_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_sender_id: string | null;
}

export interface ChatMember {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
  muted_until: string | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  client_message_id: string;
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface NotificationInbox {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
}

export interface ReportInsertPayload {
  activity_basis: string;
  activity_date: string;
  activity_time: string;
  activity_place: string;
  activity_name: string;
  participants: string;
  activity_description: string;
}

export interface ReportMediaInsertPayload {
  report_id: string;
  storage_path: string;
  media_order: number;
  crop_x: number | null;
  crop_y: number | null;
  crop_width: number | null;
  crop_height: number | null;
}

export interface ReportWithDetails extends Omit<Report, 'media' | 'recipients'> {
  media: ReportMedia[];
  recipients: ReportRecipient[];
}

export interface MemberWithPosition extends Omit<Member, 'position'> {
  position: Position | null;
  profile: Profile | null;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  chat_messages: boolean;
  report_received: boolean;
  announcements: boolean;
  social_activity: boolean;
  created_at: string;
  updated_at: string;
}
