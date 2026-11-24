-- run once as the RDS administrator against the existing solo101 database
-- the first statement prints a generated password. save it privately
CREATE USER 'solo101_app'@'%'
  IDENTIFIED BY RANDOM PASSWORD REQUIRE SSL;

-- runtime access to app data. schema migrations use a separate privileged login
GRANT SELECT, INSERT, UPDATE, DELETE ON solo101.* TO 'solo101_app'@'%';
