// Hand-written mirrors of the Pydantic models in backend/routers/orders.py.
export interface Drink {
  id: string;
  name: string;
  category: string;
  tagline: string;
  image: string;
  description: string;
  composition: string[];
  allergens: string;
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
  slots: string[];
}
