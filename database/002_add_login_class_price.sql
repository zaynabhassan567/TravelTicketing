/* =========================================================
   UPGRADE SCRIPT - run this ONCE on your existing TravelDB.
   It keeps all your current passengers and flights.

   Adds:
     - Users table (login accounts) + a starter admin account
     - FlightPrices table (price per airline + class)
     - Tickets: FlightClass, Price and BookedByUserId columns

   Safe to run twice: every step checks if it was already done.
   ========================================================= */

USE TravelDB;
GO

-- 1) Users: one row per login account.
--    PasswordHash stores a BCrypt hash, never the real password.
IF OBJECT_ID('dbo.Users', 'U') IS NULL
CREATE TABLE dbo.Users (
    UserId       INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Username     NVARCHAR(50)      NOT NULL CONSTRAINT UQ_Users_Username UNIQUE,
    PasswordHash NVARCHAR(100)     NOT NULL,
    Role         NVARCHAR(20)      NOT NULL
        CONSTRAINT CK_Users_Role CHECK (Role IN ('Admin', 'Customer')),
    CreatedAt    DATETIME2         NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME()
);
GO

-- Starter admin account.  Username: admin   Password: Admin@123
-- (Everyone who registers through the app becomes a Customer.)
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = 'admin')
INSERT INTO dbo.Users (Username, PasswordHash, Role)
VALUES ('admin', '$2a$11$enjEnPIxnxJWaLXig3qDqehHS8X8nKANnGVynmAdm8JqmvsOGu.sK', 'Admin');
GO

-- 2) FlightPrices: the price list. One row per airline + class.
--    An airline that doesn't offer a class simply has no row for it.
IF OBJECT_ID('dbo.FlightPrices', 'U') IS NULL
CREATE TABLE dbo.FlightPrices (
    Airline     NVARCHAR(50)   NOT NULL,
    FlightClass NVARCHAR(20)   NOT NULL,
    Price       DECIMAL(10, 2) NOT NULL,
    CONSTRAINT PK_FlightPrices PRIMARY KEY (Airline, FlightClass)
);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.FlightPrices)
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
GO

-- 3) New columns on Tickets (added as nullable first, filled, then made required)
IF COL_LENGTH('dbo.Tickets', 'FlightClass') IS NULL
    ALTER TABLE dbo.Tickets ADD FlightClass NVARCHAR(20) NOT NULL
        CONSTRAINT DF_Tickets_FlightClass DEFAULT 'Economy';   -- old flights become Economy
IF COL_LENGTH('dbo.Tickets', 'Price') IS NULL
    ALTER TABLE dbo.Tickets ADD Price DECIMAL(10, 2) NULL;
IF COL_LENGTH('dbo.Tickets', 'BookedByUserId') IS NULL
    ALTER TABLE dbo.Tickets ADD BookedByUserId INT NULL;
GO

-- Give old flights a price from the price list
UPDATE t
SET    t.Price = fp.Price
FROM   dbo.Tickets t
JOIN   dbo.FlightPrices fp ON fp.Airline = t.Airline AND fp.FlightClass = t.FlightClass
WHERE  t.Price IS NULL;

UPDATE dbo.Tickets SET Price = 0 WHERE Price IS NULL;   -- airline not in the price list

-- Old flights were created before logins existed: they belong to admin
UPDATE dbo.Tickets
SET    BookedByUserId = (SELECT UserId FROM dbo.Users WHERE Username = 'admin')
WHERE  BookedByUserId IS NULL;
GO

ALTER TABLE dbo.Tickets ALTER COLUMN Price DECIMAL(10, 2) NOT NULL;
ALTER TABLE dbo.Tickets ALTER COLUMN BookedByUserId INT NOT NULL;
GO

IF OBJECT_ID('dbo.FK_Tickets_Users', 'F') IS NULL
    ALTER TABLE dbo.Tickets ADD CONSTRAINT FK_Tickets_Users
        FOREIGN KEY (BookedByUserId) REFERENCES dbo.Users(UserId);
GO

-- Quick check
SELECT UserId, Username, Role FROM dbo.Users;
SELECT * FROM dbo.FlightPrices ORDER BY Airline, Price;
SELECT * FROM dbo.Tickets;
