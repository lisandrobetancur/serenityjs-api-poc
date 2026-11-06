@auth
Feature: Bearer token authentication
  As a user of the Prop Room
  I want to authenticate with JWT access and refresh tokens
  So that only known people can reach the protected endpoints

  @smoke
  Scenario Outline: Each seed user can log in and identify themselves
    Given <persona> is logged in
    When <persona> asks who they are
    Then they should receive a 200 response
    And the response should contain:
      | email | <email> |
      | role  | <role>  |

    Examples:
      | persona          | email                | role            |
      | Ada the admin    | admin@proproom.test  | admin           |
      | Carl the clerk   | clerk@proproom.test  | warehouse_clerk |
      | Vera the viewer  | viewer@proproom.test | viewer          |

  Scenario: A successful login returns a complete token pair
    When Ada logs in with her credentials
    Then she should receive a 200 response
    And the response should contain:
      | token_type | bearer |
      | expires_in | 900    |
    And the response field "access_token" should be present
    And the response field "refresh_token" should be present

  Scenario Outline: Logging in with invalid credentials is rejected
    When Gus the guest attempts to log in as "<email>" with password "<password>"
    Then he should receive a <status> response

    Examples:
      | email               | password  | status |
      | admin@proproom.test | wrong     | 401    |
      | nobody@proproom.test| Admin123! | 401    |

  Scenario: Protected endpoints challenge anonymous callers
    When Gus the guest asks who they are
    Then he should receive a 401 response
    And the "WWW-Authenticate" header should be "Bearer"
    And the error should say "Missing Bearer token"

  Scenario: A malformed token is rejected
    Given Gus uses the access token "not-a-real-jwt"
    When he asks who they are
    Then he should receive a 401 response
    And the error should say "Invalid token"

  @slow
  Scenario: An expired access token is rejected
    Given Vera is logged in with a token that expires in 1 second
    When she waits for 2 seconds
    And she asks who they are
    Then she should receive a 401 response

  Scenario: A refresh token issues a new token pair
    Given Carl is logged in
    When he refreshes his session
    Then he should receive a 200 response
    And the response field "access_token" should be present

  Scenario: Refresh tokens are single-use
    Given Carl is logged in
    And he has refreshed his session
    When he refreshes his session again with the same refresh token
    Then he should receive a 401 response

  Scenario: Logging out revokes the access token
    Given Vera is logged in
    When she logs out
    Then she should receive a 204 response
    When she asks who they are
    Then she should receive a 401 response

  Scenario: Logging out also revokes the refresh token
    Given Vera is logged in
    And she has logged out
    When she refreshes her session
    Then she should receive a 401 response
