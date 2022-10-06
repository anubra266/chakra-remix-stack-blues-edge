module default {

type Organization {
  required property name -> str;
  required property created_at -> datetime {
    default := datetime_current();
  };
  property updated_at -> datetime;
  multi link memberships := .<organization[is Membership];

}

type Membership {
  required property role -> MembershipRole;
  required property created_at -> datetime {
    default := datetime_current();
  };
  property updated_at -> datetime;
  required link organization -> Organization {
    on target delete delete source;
  }
  link user -> User {
    on target delete delete source;
  }
  # When the user joins, we will clear out the name and email and set the user.
  property invitedName -> str;
  property invitedEmail -> str {
    constraint exclusive;
  }
}

scalar type MembershipRole extending enum<ADMIN, REGULAR>;

 type User {
    required property email -> str {
      constraint exclusive;
    }
    required property created_at -> datetime {
      default := datetime_current();
    }
    property updated_at -> datetime;
    multi link passwords := .<user[is Password];
    link password := assert_single(.passwords filter not exists .retired_at);
    multi link notes := .<user[is Note];
    multi link login_attempts := .<user[is LoginAttempt];
    multi link sessions := .<user[is Session];
    multi link memberships := .<user[is Membership];
  }

  type Password {
    required property hash -> str;
    required link user -> User {
      constraint exclusive;  # one-to-one
      on target delete delete source;
    };
    property retired_at -> datetime;
  }

  type LoginAttempt {
    required property ip_address -> str;
    required property login_successful -> bool;
    required property attempted_at -> datetime;
    required link user -> User {
      on target delete delete source;
    };
  }

  type Session {
    required property data -> json;
    required property last_active -> datetime {
       default := datetime_current();
    }
    required link user -> User {
      on target delete delete source;
    };
    required link membership -> Membership {
      on target delete delete source;
    };
  }

  type Note {
    required property title -> str;
    required property body -> str;
    required property created_at -> datetime {
      default := datetime_current();
    };
    property updated_at -> datetime;
    required link user -> User {
      on target delete delete source;
    }
  }
  
}
