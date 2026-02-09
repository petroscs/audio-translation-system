-- Script to update a user's role in the database
-- Usage: Run this script with sqlite3 or through a database tool
-- After updating, the user must log out and log back in to get a new JWT token with the updated role

-- First, let's see all users and their current roles
SELECT Id, Username, Email, Role FROM users;

-- Update a specific user's role to 'Listener'
-- Replace 'YOUR_USERNAME' with your actual username or email
-- Valid roles are: Admin, Translator, Listener
UPDATE users 
SET Role = 'Listener', UpdatedAt = CURRENT_TIMESTAMP
WHERE Username = 'YOUR_USERNAME' OR Email = 'YOUR_USERNAME';

-- Or update by user ID (GUID)
-- UPDATE users 
-- SET Role = 'Listener', UpdatedAt = CURRENT_TIMESTAMP
-- WHERE Id = 'YOUR_USER_ID_HERE';

-- Verify the update
SELECT Id, Username, Email, Role FROM users WHERE Username = 'YOUR_USERNAME' OR Email = 'YOUR_USERNAME';
