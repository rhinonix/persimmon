# PIR Deactivation Fix - RLS Policy Violation Resolution

## Issue Description

When attempting to deactivate a PIR (Priority Intelligence Requirement) on the admin page, users encountered the following error:

```
Failed to toggle PIR: new row violates row-level security policy for table "user_activity"
```

## Root Cause Analysis

The issue was caused by a combination of factors in the database trigger system:

### 1. Database Trigger Function

The `log_pir_activity()` trigger function automatically logs user activity when PIRs are created or updated. When a PIR's `active` status changes, it tries to insert a record into the `user_activity` table.

### 2. Missing `updated_by` Field

The original `updatePIR()` function in `database.js` did not set the `updated_by` field when updating PIRs. This meant that when the trigger tried to log activity, it attempted to use a NULL value for the user ID.

### 3. Row-Level Security (RLS) Policy

The `user_activity` table has an RLS policy that requires:

```sql
CREATE POLICY "Users can insert their own activity" ON user_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

When the trigger tried to insert a record with a NULL `user_id`, it violated this policy.

## Solution Implementation

### 1. Updated JavaScript Code

Modified the `updatePIR()` function in `src/assets/js/database.js` to:

- Check for user authentication
- Add the `updated_by` field with the current user's ID to all PIR updates

```javascript
async updatePIR(id, updates) {
  try {
    const user = await PersimmonAuth.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Add updated_by field to track who made the change
    const updateData = {
      ...updates,
      updated_by: user.id,
    };

    const { data, error } = await this.supabase
      .from("pirs")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating PIR:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Database error in updatePIR:", error);
    throw error;
  }
},
```

### 2. Updated Database Trigger

Created a more robust trigger function in `docs/fix_pir_activity_trigger.sql` that:

- Handles NULL values gracefully
- Uses `COALESCE(NEW.updated_by, NEW.created_by)` to fall back to the creator if no updater is specified
- Only attempts to log activity if a valid user ID is available

```sql
CREATE OR REPLACE FUNCTION log_pir_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Only log if created_by is not NULL
        IF NEW.created_by IS NOT NULL THEN
            INSERT INTO user_activity (user_id, action, description)
            VALUES (NEW.created_by, 'create_pir', 'Created new PIR: ' || NEW.name);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log activity changes if we have a valid user ID
        IF OLD.active != NEW.active THEN
            -- Use updated_by if available, otherwise fall back to created_by
            DECLARE
                user_for_log UUID;
            BEGIN
                user_for_log := COALESCE(NEW.updated_by, NEW.created_by);

                -- Only insert if we have a valid user ID
                IF user_for_log IS NOT NULL THEN
                    INSERT INTO user_activity (user_id, action, description)
                    VALUES (user_for_log,
                           CASE WHEN NEW.active THEN 'activate_pir' ELSE 'deactivate_pir' END,
                           'PIR status changed: ' || NEW.name);
                END IF;
            END;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';
```

## Files Modified

1. **`src/assets/js/database.js`** - Updated `updatePIR()` function to include `updated_by` field
2. **`docs/fix_pir_activity_trigger.sql`** - New SQL script to fix the database trigger

## Deployment Steps

To fix this issue in your Supabase database:

1. **Apply the JavaScript changes** - The updated `database.js` file is already in place
2. **Run the SQL fix** - Execute the contents of `docs/fix_pir_activity_trigger.sql` in your Supabase SQL Editor

## Testing

After applying the fix:

1. Navigate to the admin page
2. Try to deactivate a PIR by clicking the "Deactivate" button
3. The operation should complete successfully without the RLS policy violation error
4. Check the user activity log to confirm the action was properly recorded

## Prevention

This fix ensures that:

- All PIR updates include proper user tracking
- Database triggers handle edge cases gracefully
- User activity logging works correctly with RLS policies
- The system is more robust against similar authentication-related issues

## Related Components

- **Admin Page**: `src/pages/admin.html` - PIR management interface
- **Database Service**: `src/assets/js/database.js` - PIR CRUD operations
- **Database Schema**: `docs/schema_enhancements_for_dynamic_pirs.sql` - PIR table structure
- **RLS Policies**: Defined in the main schema setup files
