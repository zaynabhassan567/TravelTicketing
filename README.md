# Petal Air – Passenger Travel System

A small full-stack learning project.

| Layer    | Tech                                        | Folder               |
|----------|---------------------------------------------|----------------------|
| Database | SQL Server LocalDB (SSMS)                   | `database/`          |
| Backend  | C# / ASP.NET Core 8 Web API + EF Core + JWT | `backend/TravelApi/` |
| Frontend | React 18 + Vite                             | `frontend/`          |

## Features
- Login / register (passwords hashed with BCrypt, JWT tokens, auto log-out on expiry)
- Roles: **Admin** sees every flight; **Customer** sees only flights they booked
- Passenger entry form with flight class and a live ticket-price preview
- Travel history by passenger ID: edit / delete / add rows locally, then **Save all**
  (the API clears the rows and bulk-inserts the list in one transaction)

## Setup
1. **Database** – existing database: run `database/002_add_login_class_price.sql` once.
   Fresh database: run `database/TravelDB.sql` (this wipes the tables).
2. **JWT key** – `backend/TravelApi/appsettings.Development.json` must contain
   `{ "Jwt": { "Key": "<random string, at least 32 characters>" } }`.
   This file is in `.gitignore`, so it is never pushed. Create it after cloning.
3. **Backend** – open `backend/TravelApi/TravelApi.csproj` in Visual Studio 2022, `http` profile, F5.
4. **Frontend** – `cd frontend`, `npm install`, `npm run dev`, open http://localhost:5173.

Starter admin login: `admin` / `Admin@123`. New sign-ups are Customers.

## API
| Method | URL                                 | Who        | Purpose                                 |
|--------|-------------------------------------|------------|-----------------------------------------|
| POST   | /api/auth/register                  | anyone     | Create a Customer account               |
| POST   | /api/auth/login                     | anyone     | Get a JWT token                         |
| GET    | /api/prices                         | logged in  | Price list (airline + class + price)    |
| POST   | /api/passengers                     | logged in  | Entry form: passenger + one flight      |
| GET    | /api/passengers, /api/passengers/{id} | Admin    | List / read passengers                  |
| PUT    | /api/passengers/{id}                | Admin      | Update passenger details                |
| DELETE | /api/passengers/{id}                | Admin      | Delete passenger and their flights      |
| GET    | /api/tickets/history/{passengerId}  | logged in  | Flights (customers: only their own)     |
| PUT    | /api/tickets/history/{passengerId}  | logged in  | Save all (customers: only their own)    |
