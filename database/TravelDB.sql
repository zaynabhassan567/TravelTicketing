/* =========================================================
   TravelDB - FULL setup script (fresh database).
   WARNING: this DELETES the tables and all their data first.
   If you already have data, run 002_add_login_class_price.sql instead.
   ========================================================= */

IF DB_ID('TravelDB') IS NULL
    CREATE DATABASE TravelDB;
GO

USE TravelDB;
GO

-- Drop in dependency order (Tickets points at Passengers and Users)
IF OBJECT_ID('dbo.Tickets', 'U')      IS NOT NULL DROP TABLE dbo.Tickets;
IF OBJECT_ID('dbo.Passengers', 'U')   IS NOT NULL DROP TABLE dbo.Passengers;
IF OBJECT_ID('dbo.FlightPrices', 'U') IS NOT NULL DROP TABLE dbo.FlightPrices;
IF OBJECT_ID('dbo.Users', 'U')        IS NOT NULL DROP TABLE dbo.Users;
GO

-- Login accounts. PasswordHash is a BCrypt hash, never the real password.
CREATE TABLE dbo.Users (
    UserId       INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Username     NVARCHAR(50)      NOT NULL CONSTRAINT UQ_Users_Username UNIQUE,
    PasswordHash NVARCHAR(100)     NOT NULL,
    Role         NVARCHAR(20)      NOT NULL
        CONSTRAINT CK_Users_Role CHECK (Role IN ('Admin', 'Customer')),
    CreatedAt    DATETIME2         NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME()
);

-- Passengers: one row per person. PassengerId is typed in by the user.
CREATE TABLE dbo.Passengers (
    PassengerId INT           NOT NULL PRIMARY KEY,
    Name        NVARCHAR(100) NOT NULL,
    Contact     NVARCHAR(20)  NOT NULL,
    Gender      NVARCHAR(10)  NOT NULL
);

-- Price list: one row per airline + class
CREATE TABLE dbo.FlightPrices (
    Airline     NVARCHAR(50)   NOT NULL,
    FlightClass NVARCHAR(20)   NOT NULL,
    Price       DECIMAL(10, 2) NOT NULL,
    CONSTRAINT PK_FlightPrices PRIMARY KEY (Airline, FlightClass)
);

-- Tickets: one row per flight.
--   PassengerId    -> who is flying (deleting a passenger deletes their tickets)
--   BookedByUserId -> which login account booked it (decides who can see it)
--   Price          -> copied from FlightPrices at booking time
CREATE TABLE dbo.Tickets (
    TicketId       INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    PassengerId    INT               NOT NULL,
    FlightDate     DATE              NOT NULL,
    Airline        NVARCHAR(50)      NOT NULL,
    FlightClass    NVARCHAR(20)      NOT NULL,
    Price          DECIMAL(10, 2)    NOT NULL,
    Destination    NVARCHAR(100)     NOT NULL,
    BookedByUserId INT               NOT NULL,
    CONSTRAINT FK_Tickets_Passengers FOREIGN KEY (PassengerId)
        REFERENCES dbo.Passengers(PassengerId) ON DELETE CASCADE,
    CONSTRAINT FK_Tickets_Users FOREIGN KEY (BookedByUserId)
        REFERENCES dbo.Users(UserId)
);
GO

-- ---------- Sample data ----------
-- Admin login.  Username: admin   Password: Admin@123
INSERT INTO dbo.Users (Username, PasswordHash, Role)
VALUES ('admin', '$2a$11$enjEnPIxnxJWaLXig3qDqehHS8X8nKANnGVynmAdm8JqmvsOGu.sK', 'Admin');

INSERT INTO dbo.FlightPrices (Airline, FlightClass, Price) VALUES
('PIA',              'Economy',   45000),
('PIA',              'Business', 120000),
('Airblue',          'Economy',   38000),
('Airblue',          'Business',  90000),
('Emirates',         'Economy',   95000),
('Emirates',         'Business', 280000),
('Emirates',         'First',    520000),
('Qatar Airways',    'Economy',   90000),
('Qatar Airways',    'Business', 260000),
('Qatar Airways',    'First',    480000),
('Saudia',           'Economy',   80000),
('Saudia',           'Business', 210000),
('Saudia',           'First',    390000),
('Turkish Airlines', 'Economy',  110000),
('Turkish Airlines', 'Business', 320000);

INSERT INTO dbo.Passengers (PassengerId, Name, Contact, Gender) VALUES
(5, 'Ayesha Khan', '03001234567', 'Female'),
(7, 'Bilal Ahmed', '03217654321', 'Male');

INSERT INTO dbo.Tickets (PassengerId, FlightDate, Airline, FlightClass, Price, Destination, BookedByUserId) VALUES
(5, '2026-01-12', 'Emirates',      'Economy',   95000, 'Dubai',     1),
(5, '2026-04-03', 'Qatar Airways', 'Business', 260000, 'Doha',      1),
(5, '2026-08-21', 'PIA',           'Economy',   45000, 'Islamabad', 1),
(7, '2026-06-15', 'Saudia',        'Economy',   80000, 'Jeddah',    1);
GO

SELECT UserId, Username, Role FROM dbo.Users;
SELECT * FROM dbo.Passengers;
SELECT * FROM dbo.Tickets;
