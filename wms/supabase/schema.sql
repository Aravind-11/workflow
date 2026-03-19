create extension if not exists "uuid-ossp";

create table warehouses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text unique not null,
  address text,
  city text,
  state text,
  country text default 'US',
  zip text,
  lat numeric,
  lng numeric,
  timezone text default 'America/Phoenix',
  capacity_sqft int,
  open_time time,
  close_time time,
  contact_name text,
  contact_email text,
  contact_phone text,
  active boolean default true,
  created_at timestamptz default now()
);

create table warehouse_locations (
  id uuid primary key default uuid_generate_v4(),
  warehouse_id uuid references warehouses(id) on delete cascade,
  code text not null,
  zone text,
  aisle text,
  rack text,
  bin text,
  max_weight_kg numeric,
  max_volume_m3 numeric,
  active boolean default true,
  unique(warehouse_id, code)
);

create table skus (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  name text not null,
  upc text,
  description text,
  length_cm numeric,
  width_cm numeric,
  height_cm numeric,
  weight_kg numeric,
  handling_notes text,
  uom text default 'each',
  uom_conversion jsonb,
  created_at timestamptz default now()
);

create table inventory (
  id uuid primary key default uuid_generate_v4(),
  warehouse_id uuid references warehouses(id),
  location_id uuid references warehouse_locations(id),
  sku_id uuid references skus(id),
  quantity int not null default 0,
  lot text,
  expiry_date date,
  status text default 'available',
  updated_at timestamptz default now(),
  unique(warehouse_id, location_id, sku_id, lot)
);

create table purchase_orders (
  id uuid primary key default uuid_generate_v4(),
  warehouse_id uuid references warehouses(id),
  po_number text unique not null,
  supplier text,
  expected_date date,
  status text default 'pending',
  notes text,
  created_at timestamptz default now()
);

create table po_lines (
  id uuid primary key default uuid_generate_v4(),
  po_id uuid references purchase_orders(id) on delete cascade,
  sku_id uuid references skus(id),
  qty_ordered int not null,
  qty_received int default 0,
  lot text,
  expiry_date date
);

create table sales_orders (
  id uuid primary key default uuid_generate_v4(),
  warehouse_id uuid references warehouses(id),
  order_number text unique not null,
  customer_name text,
  customer_ref text,
  ship_by_date date,
  status text default 'pending',
  carrier text,
  service text,
  tracking text,
  created_at timestamptz default now()
);

create table order_lines (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references sales_orders(id) on delete cascade,
  sku_id uuid references skus(id),
  qty_ordered int not null,
  qty_picked int default 0,
  qty_packed int default 0,
  lot text
);

create table pick_lists (
  id uuid primary key default uuid_generate_v4(),
  warehouse_id uuid references warehouses(id),
  method text default 'single',
  status text default 'open',
  assigned_to uuid,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table pick_list_lines (
  id uuid primary key default uuid_generate_v4(),
  pick_list_id uuid references pick_lists(id) on delete cascade,
  order_line_id uuid references order_lines(id),
  location_id uuid references warehouse_locations(id),
  sku_id uuid references skus(id),
  qty_required int,
  qty_picked int default 0,
  status text default 'pending'
);

create table shipments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references sales_orders(id),
  warehouse_id uuid references warehouses(id),
  carrier text,
  service text,
  tracking text,
  weight_kg numeric,
  boxes int,
  status text default 'pending',
  shipped_at timestamptz,
  created_at timestamptz default now()
);

create table rmas (
  id uuid primary key default uuid_generate_v4(),
  warehouse_id uuid references warehouses(id),
  rma_number text unique not null,
  original_order_id uuid references sales_orders(id),
  customer_name text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table rma_lines (
  id uuid primary key default uuid_generate_v4(),
  rma_id uuid references rmas(id) on delete cascade,
  sku_id uuid references skus(id),
  qty int,
  lot text,
  disposition text,
  qc_notes text
);

create table workers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique,
  phone text,
  role text default 'picker',
  certifications text[],
  active boolean default true,
  created_at timestamptz default now()
);

create table shifts (
  id uuid primary key default uuid_generate_v4(),
  warehouse_id uuid references warehouses(id),
  name text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz default now()
);

create table shift_assignments (
  id uuid primary key default uuid_generate_v4(),
  shift_id uuid references shifts(id) on delete cascade,
  worker_id uuid references workers(id),
  clock_in timestamptz,
  clock_out timestamptz,
  unique(shift_id, worker_id)
);

create table tasks (
  id uuid primary key default uuid_generate_v4(),
  warehouse_id uuid references warehouses(id),
  worker_id uuid references workers(id),
  type text,
  ref_id uuid,
  status text default 'open',
  due_at timestamptz,
  completed_at timestamptz
);

create table deliveries (
  id uuid primary key default uuid_generate_v4(),
  warehouse_id uuid references warehouses(id),
  direction text default 'inbound',
  carrier text,
  manifest_ref text,
  dock text,
  scheduled_at timestamptz,
  arrived_at timestamptz,
  released_at timestamptz,
  status text default 'scheduled',
  notes text
);

create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  action text not null,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

create table user_roles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  role text not null,
  warehouse_id uuid references warehouses(id)
);

alter table warehouses enable row level security;
alter table inventory enable row level security;
alter table purchase_orders enable row level security;
alter table sales_orders enable row level security;
alter table shipments enable row level security;
alter table rmas enable row level security;
alter table workers enable row level security;
alter table shifts enable row level security;
alter table shift_assignments enable row level security;
alter table tasks enable row level security;
alter table deliveries enable row level security;

create policy "Authenticated can read warehouses"
  on warehouses for select using (auth.role() = 'authenticated');

insert into warehouses (name, code, city, state, country, zip, lat, lng, capacity_sqft) values
  ('Phoenix Distribution Center', 'PHX-01', 'Phoenix', 'AZ', 'US', '85001', 33.4484, -112.0740, 120000),
  ('Los Angeles Hub', 'LAX-01', 'Los Angeles', 'CA', 'US', '90001', 34.0522, -118.2437, 85000),
  ('Dallas Fulfillment Center', 'DAL-01', 'Dallas', 'TX', 'US', '75201', 32.7767, -96.7970, 95000),
  ('Chicago Midwest DC', 'CHI-01', 'Chicago', 'IL', 'US', '60601', 41.8781, -87.6298, 110000),
  ('Atlanta Southeast Hub', 'ATL-01', 'Atlanta', 'GA', 'US', '30301', 33.7490, -84.3880, 75000);
