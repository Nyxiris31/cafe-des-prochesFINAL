// Hand-written mirrors of the Pydantic models in backend/routers/*.py.
export interface Drink {
  id: string;
  name: string;
  category: string;
  tagline: string;
  image: string;
  description: string;
  composition: string[];
  allergens: string;
  available: boolean;
  sort_order: number;
}

export interface DrinkCreate {
  name: string;
  category: string;
  description: string;
  image: string;
  tagline?: string;
  composition?: string[];
  allergens?: string;
}

export interface DrinkUpdate {
  name?: string;
  category?: string;
  description?: string;
  image?: string;
  tagline?: string;
  composition?: string[];
  allergens?: string;
  available?: boolean;
}

export interface Order {
  id: string;
  drink_id: string;
  drink_name: string;
  drink_image: string;
  date: string;
  time: string;
  first_name: string;
  note: string | null;
  user_id: string;
  user_email: string;
  created_at: string;
}

export interface OrderCreate {
  drink_id: string;
  date: string;
  time: string;
  first_name: string;
  note?: string | null;
}

export interface TodayInfo {
  today: string;
  now: string;
  slots: string[];
}

export interface User {
  user_id: string;
  email: string;
  name: string;
  picture: string | null;
  is_admin: boolean;
}

export interface PushKey {
  public_key: string;
}
