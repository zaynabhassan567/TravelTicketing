/* =========================================================
   UPGRADE SCRIPT 003 - run ONCE on your existing TravelDB
   (after 002_add_login_class_price.sql).

   Links each customer account to ONE passenger profile:
   - first booking  -> a new Passenger ID is assigned
   - later bookings -> the same Passenger ID is reused
   Safe to run twice.
   ========================================================= */
USE TravelDB;
GO

-- 1) New column: which passenger profile belongs to this account (customers only)
IF COL_LENGTH('dbo.Users', 'PassengerId') IS NULL
    ALTER TABLE dbo.Users ADD PassengerId INT NULL;
GO

-- 2) It must point to a real passenger. If that passenger is deleted, the link is cleared.
IF OBJECT_ID('dbo.FK_Users_Passengers', 'F') IS NULL
    ALTER TABLE dbo.Users ADD CONSTRAINT FK_Users_Passengers
        FOREIGN KEY (PassengerId) REFERENCES dbo.Passengers(PassengerId) ON DELETE SET NULL;
GO

-- 3) One passenger profile can belong to only one account
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Users_PassengerId')
    CREATE UNIQUE INDEX UX_Users_PassengerId ON dbo.Users(PassengerId) WHERE PassengerId IS NOT NULL;
GO

-- 4) Existing customers: link them to the passenger of their latest booking
;WITH latest AS (
    SELECT t.BookedByUserId AS UserId, t.PassengerId,
           ROW_NUMBER() OVER (PARTITION BY t.BookedByUserId
                              ORDER BY t.FlightDate DESC, t.TicketId DESC) AS rn
    FROM dbo.Tickets t
    JOIN dbo.Users u ON u.UserId = t.BookedByUserId
    WHERE u.Role = 'Customer' AND u.PassengerId IS NULL
), firstClaim AS (
    SELECT UserId, PassengerId,
           ROW_NUMBER() OVER (PARTITION BY PassengerId ORDER BY UserId) AS claim
    FROM latest
    WHERE rn = 1
)
UPDATE u
SET    u.PassengerId = f.PassengerId
FROM   dbo.Users u
JOIN   firstClaim f ON f.UserId = u.UserId
WHERE  f.claim = 1
  AND  NOT EXISTS (SELECT 1 FROM dbo.Users x WHERE x.PassengerId = f.PassengerId);
GO

SELECT UserId, Username, Role, PassengerId FROM dbo.Users;
