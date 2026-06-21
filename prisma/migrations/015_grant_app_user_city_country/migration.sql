-- Grant app_user UPDATE on users.city/users.country only.
-- Migrations 7 (user_location_fields) and 9 (add_user_phone) added these
-- columns without a matching grant, so app_user (the role ai-service writes
-- with) could SELECT but not UPDATE them. Needed for Phase 5 of the
-- onboarding UX fixes: ai-service now writes city/country back to the user
-- row when the questionnaire's city/country nodes are answered. Scoped to
-- exactly these two columns — app_user still cannot touch phone, role, or
-- any other column on users.
GRANT UPDATE (city, country) ON "users" TO app_user;
