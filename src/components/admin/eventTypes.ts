export interface Event {
  id: string; name: string; slug: string; series: string | null; location: string | null;
  start_date: string | null; end_date: string | null; set_count: number; description: string | null;
  website: string | null; cover_image_r2_key: string | null; logo_r2_key: string | null;
  year?: number | null;
  source_1001_id?: string | null;
  facebook_url?: string | null; instagram_url?: string | null;
  youtube_url?: string | null; x_url?: string | null;
  aftermovie_url?: string | null;
}
