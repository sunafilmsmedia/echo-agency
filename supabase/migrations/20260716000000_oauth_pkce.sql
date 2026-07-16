-- PKCE support: store the code_verifier alongside each pending OAuth state.
-- Calendly (and many modern OAuth providers) now require PKCE for public clients.
ALTER TABLE oauth_states
  ADD COLUMN IF NOT EXISTS code_verifier text;
