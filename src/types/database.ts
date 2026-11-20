export type UserRole = 'user' | 'tec_verified' | 'admin';
export type FavoriteItemType = 'indicator' | 'news';
export type DatasetSource = 'amg_2026' | 'tec_2026';
export type FilterType = 'general' | 'gender' | 'age_group' | 'estrato';

export interface ProfileRow {
  id: string;
  email: string;
  role: UserRole;
  is_tec_verified: boolean;
  created_at: string;
}

export interface FavoriteRow {
  user_id: string;
  item_id: string;
  item_type: FavoriteItemType;
  created_at: string;
}
