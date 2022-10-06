CREATE MIGRATION m1c4kywkkfoh4kvgtwk46lpwerbvrcqxaiwk3pw36e6ziheqqmkzaa
    ONTO initial
{
  CREATE TYPE default::LoginAttempt {
      CREATE REQUIRED PROPERTY attempted_at -> std::datetime;
      CREATE REQUIRED PROPERTY ip_address -> std::str;
      CREATE REQUIRED PROPERTY login_successful -> std::bool;
  };
  CREATE TYPE default::User {
      CREATE REQUIRED PROPERTY created_at -> std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE REQUIRED PROPERTY email -> std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE PROPERTY updated_at -> std::datetime;
  };
  ALTER TYPE default::LoginAttempt {
      CREATE REQUIRED LINK user -> default::User {
          ON TARGET DELETE DELETE SOURCE;
      };
  };
  ALTER TYPE default::User {
      CREATE MULTI LINK login_attempts := (.<user[IS default::LoginAttempt]);
  };
  CREATE SCALAR TYPE default::MembershipRole EXTENDING enum<ADMIN, REGULAR>;
  CREATE TYPE default::Membership {
      CREATE LINK user -> default::User {
          ON TARGET DELETE DELETE SOURCE;
      };
      CREATE REQUIRED PROPERTY created_at -> std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE PROPERTY invitedEmail -> std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE PROPERTY invitedName -> std::str;
      CREATE REQUIRED PROPERTY role -> default::MembershipRole;
      CREATE PROPERTY updated_at -> std::datetime;
  };
  CREATE TYPE default::Organization {
      CREATE REQUIRED PROPERTY created_at -> std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE REQUIRED PROPERTY name -> std::str;
      CREATE PROPERTY updated_at -> std::datetime;
  };
  ALTER TYPE default::Membership {
      CREATE REQUIRED LINK organization -> default::Organization {
          ON TARGET DELETE DELETE SOURCE;
      };
  };
  ALTER TYPE default::Organization {
      CREATE MULTI LINK memberships := (.<organization[IS default::Membership]);
  };
  ALTER TYPE default::User {
      CREATE MULTI LINK memberships := (.<user[IS default::Membership]);
  };
  CREATE TYPE default::Session {
      CREATE REQUIRED LINK membership -> default::Membership {
          ON TARGET DELETE DELETE SOURCE;
      };
      CREATE REQUIRED LINK user -> default::User {
          ON TARGET DELETE DELETE SOURCE;
      };
      CREATE REQUIRED PROPERTY data -> std::json;
      CREATE REQUIRED PROPERTY last_active -> std::datetime {
          SET default := (std::datetime_current());
      };
  };
  CREATE TYPE default::Note {
      CREATE REQUIRED LINK user -> default::User {
          ON TARGET DELETE DELETE SOURCE;
      };
      CREATE REQUIRED PROPERTY body -> std::str;
      CREATE REQUIRED PROPERTY created_at -> std::datetime {
          SET default := (std::datetime_current());
      };
      CREATE REQUIRED PROPERTY title -> std::str;
      CREATE PROPERTY updated_at -> std::datetime;
  };
  ALTER TYPE default::User {
      CREATE MULTI LINK notes := (.<user[IS default::Note]);
  };
  CREATE TYPE default::Password {
      CREATE REQUIRED LINK user -> default::User {
          ON TARGET DELETE DELETE SOURCE;
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE PROPERTY retired_at -> std::datetime;
      CREATE REQUIRED PROPERTY hash -> std::str;
  };
  ALTER TYPE default::User {
      CREATE MULTI LINK passwords := (.<user[IS default::Password]);
      CREATE LINK password := (std::assert_single(.passwords FILTER
          NOT (EXISTS (.retired_at))
      ));
      CREATE MULTI LINK sessions := (.<user[IS default::Session]);
  };
};
