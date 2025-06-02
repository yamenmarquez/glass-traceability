-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.glass_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type_name text NOT NULL,
  description text,
  thickness numeric,
  color text,
  specifications jsonb,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT glass_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  client_id uuid NOT NULL,
  client_po text,
  barcode text UNIQUE,
  glass_type_id uuid NOT NULL,
  total_pieces integer DEFAULT 0,
  priority USER-DEFINED DEFAULT 'medium'::priority_level,
  status USER-DEFINED DEFAULT 'pending'::order_status,
  remarks text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT orders_glass_type_id_fkey FOREIGN KEY (glass_type_id) REFERENCES public.glass_types(id)
);
CREATE TABLE public.pieces (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  piece_number integer NOT NULL,
  width_inches integer DEFAULT 0,
  width_fraction text DEFAULT '0'::text,
  height_inches integer DEFAULT 0,
  height_fraction text DEFAULT '0'::text,
  holes_count integer DEFAULT 0,
  barcode text NOT NULL UNIQUE,
  current_status text DEFAULT 'pending'::text,
  remarks text,
  location text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  label text,
  sq_ft numeric DEFAULT ((((width_inches)::numeric +
CASE
    WHEN (width_fraction = '1/16'::text) THEN 0.0625
    WHEN (width_fraction = '1/8'::text) THEN 0.125
    WHEN (width_fraction = '3/16'::text) THEN 0.1875
    WHEN (width_fraction = '1/4'::text) THEN 0.25
    WHEN (width_fraction = '5/16'::text) THEN 0.3125
    WHEN (width_fraction = '3/8'::text) THEN 0.375
    WHEN (width_fraction = '7/16'::text) THEN 0.4375
    WHEN (width_fraction = '1/2'::text) THEN 0.5
    WHEN (width_fraction = '9/16'::text) THEN 0.5625
    WHEN (width_fraction = '5/8'::text) THEN 0.625
    WHEN (width_fraction = '11/16'::text) THEN 0.6875
    WHEN (width_fraction = '3/4'::text) THEN 0.75
    WHEN (width_fraction = '13/16'::text) THEN 0.8125
    WHEN (width_fraction = '7/8'::text) THEN 0.875
    WHEN (width_fraction = '15/16'::text) THEN 0.9375
    ELSE (0)::numeric
END) * ((height_inches)::numeric +
CASE
    WHEN (height_fraction = '1/16'::text) THEN 0.0625
    WHEN (height_fraction = '1/8'::text) THEN 0.125
    WHEN (height_fraction = '3/16'::text) THEN 0.1875
    WHEN (height_fraction = '1/4'::text) THEN 0.25
    WHEN (height_fraction = '5/16'::text) THEN 0.3125
    WHEN (height_fraction = '3/8'::text) THEN 0.375
    WHEN (height_fraction = '7/16'::text) THEN 0.4375
    WHEN (height_fraction = '1/2'::text) THEN 0.5
    WHEN (height_fraction = '9/16'::text) THEN 0.5625
    WHEN (height_fraction = '5/8'::text) THEN 0.625
    WHEN (height_fraction = '11/16'::text) THEN 0.6875
    WHEN (height_fraction = '3/4'::text) THEN 0.75
    WHEN (height_fraction = '13/16'::text) THEN 0.8125
    WHEN (height_fraction = '7/8'::text) THEN 0.875
    WHEN (height_fraction = '15/16'::text) THEN 0.9375
    ELSE (0)::numeric
END)) / (144)::numeric),
  CONSTRAINT pieces_pkey PRIMARY KEY (id),
  CONSTRAINT pieces_order_number_fkey FOREIGN KEY (order_number) REFERENCES public.orders(order_number)
);
CREATE TABLE public.processing_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  barcode text NOT NULL,
  station_id uuid,
  processed_at timestamp with time zone DEFAULT now(),
  employee text NOT NULL,
  observations text,
  created_at timestamp with time zone DEFAULT now(),
  service_station_id uuid,
  CONSTRAINT processing_history_pkey PRIMARY KEY (id),
  CONSTRAINT processing_history_service_station_id_fkey FOREIGN KEY (service_station_id) REFERENCES public.work_stations(id),
  CONSTRAINT processing_history_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.work_stations(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role USER-DEFINED DEFAULT 'viewer'::user_role,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.service_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  station_id uuid,
  station_name character varying NOT NULL,
  location character varying NOT NULL,
  permissions jsonb DEFAULT '["scan", "update_status"]'::jsonb,
  expires_at timestamp with time zone NOT NULL,
  last_activity timestamp with time zone DEFAULT now(),
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT service_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT service_sessions_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.work_stations(id)
);
CREATE TABLE public.status_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status_name text NOT NULL,
  station_id uuid,
  color text DEFAULT '#6B7280'::text,
  is_final boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT status_config_pkey PRIMARY KEY (id),
  CONSTRAINT status_config_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.work_stations(id)
);
CREATE TABLE public.work_stations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  station_name text NOT NULL UNIQUE,
  active boolean DEFAULT true,
  order_sequence integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  station_secret character varying,
  permissions jsonb DEFAULT '["scan", "update_status"]'::jsonb,
  location character varying,
  CONSTRAINT work_stations_pkey PRIMARY KEY (id)
);