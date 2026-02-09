# How to Update User Roles

If you're getting a 403 Forbidden error when trying to create a session, it means your user account doesn't have the required role (Listener or Translator).

## Quick Fix Options

### Option 1: Use the PowerShell Script (Recommended)

1. Open PowerShell in the project root directory
2. Run:
   ```powershell
   .\database\update_user_role.ps1 -UsernameOrEmail "your_username_or_email"
   ```
   
   Or specify a different role:
   ```powershell
   .\database\update_user_role.ps1 -UsernameOrEmail "your_username_or_email" -Role "Listener"
   ```

3. After updating, **log out and log back in** to get a new JWT token with the updated role.

### Option 2: Use SQLite Command Line

1. Install SQLite if you haven't already: https://www.sqlite.org/download.html
2. Navigate to the database directory:
   ```powershell
   cd database
   ```
3. Open the database:
   ```powershell
   sqlite3 audio_translation.db
   ```
4. View all users:
   ```sql
   SELECT Id, Username, Email, Role FROM users;
   ```
5. Update your user's role:
   ```sql
   UPDATE users 
   SET Role = 'Listener', UpdatedAt = CURRENT_TIMESTAMP
   WHERE Username = 'your_username' OR Email = 'your_email';
   ```
6. Verify the update:
   ```sql
   SELECT Id, Username, Email, Role FROM users WHERE Username = 'your_username';
   ```
7. Exit SQLite:
   ```sql
   .exit
   ```

### Option 3: Use a Database Tool

You can use any SQLite database tool (like DB Browser for SQLite, DBeaver, or VS Code extensions) to:
1. Open `database\audio_translation.db`
2. Navigate to the `users` table
3. Find your user row
4. Update the `Role` column to `Listener` (or `Translator` if needed)
5. Save the changes

## Valid Roles

- **Admin**: Can do everything
- **Translator**: Can create translator sessions (broadcast audio)
- **Listener**: Can create listener sessions (receive audio)

## Important Notes

1. **After updating your role in the database, you MUST log out and log back in** to get a new JWT token that includes the updated role. The JWT token is created during login and contains your role at that time.

2. If you're an Admin, you can also use the API endpoint `PUT /api/users/{id}` to update roles programmatically (requires admin authentication).

3. The database path is relative to the backend project: `..\\..\\database\\audio_translation.db`

## Troubleshooting

- **"User not found"**: Check your username/email spelling. The script will show all available users.
- **"Database not found"**: Make sure you're running from the project root, or specify the full path to the database file.
- **"sqlite3 command not found"**: Install SQLite and add it to your PATH, or use a database GUI tool instead.
