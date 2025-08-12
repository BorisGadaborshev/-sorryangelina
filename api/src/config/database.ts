import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
const ssl = process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD, // это должно быть строкой
  port: process.env.DB_PORT,
});

export const connectDB = async (): Promise<void> => {
  // Initialize connection and ensure schema exists
  await pool.connect();

  // Create tables if they don't exist
  await pool.query(`
    create table if not exists rooms (
      id text primary key,
      password text not null,
      owner text not null,
      phase text not null check (phase in ('creation','voting','discussion')),
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );

    create table if not exists room_users (
      id text not null,
      name text not null,
      room_id text not null references rooms(id) on delete cascade,
      role text not null check (role in ('admin','user')),
      is_ready boolean default false,
      primary key (room_id, id)
    );

    create table if not exists cards (
      id text primary key,
      room_id text not null references rooms(id) on delete cascade,
      text text not null,
      type text not null check (type in ('liked','disliked','suggestion')),
      created_by text not null,
      column_index integer not null
    );

    create table if not exists card_votes (
      card_id text not null references cards(id) on delete cascade,
      user_id text not null,
      vote text not null check (vote in ('like','dislike')),
      primary key (card_id, user_id)
    );

    create index if not exists idx_cards_room on cards(room_id);
    create index if not exists idx_users_room on room_users(room_id);
  `);

  console.log('Connected to PostgreSQL and ensured schema');
};