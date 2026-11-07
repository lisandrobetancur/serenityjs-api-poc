@users
Feature: User management
  As an administrator
  I want to manage the accounts of the props department
  So that each person has the right level of access

  @smoke @users_01
  Scenario: The admin lists every user
    Given Ada the admin is logged in
    When she lists the users
    Then she should receive a 200 response
    And the response field "total" should be 3
    And the response field "items" should list 3 entries

  @users_02
  Scenario: The admin filters users by role
    Given Ada the admin is logged in
    When she lists the users with the role "warehouse_clerk"
    Then she should receive a 200 response
    And every entry in "items" should have "role" equal to "warehouse_clerk"

  @users_03
  Scenario Outline: Only admins can list users
    Given <persona> is logged in
    When <persona> lists the users
    Then they should receive a 403 response

    Examples:
      | persona         |
      | Carl the clerk  |
      | Vera the viewer |

  @users_04
  Scenario: Anyone can read their own user
    Given Vera the viewer is logged in
    When she fetches user 3
    Then she should receive a 200 response
    And the response field "email" should be "viewer@proproom.test"

  @users_05
  Scenario: Non-admins cannot read other users
    Given Vera the viewer is logged in
    When she fetches user 1
    Then she should receive a 403 response
    And the error should say "only access your own user"

  @users_06
  Scenario: Fetching a user that does not exist
    Given Ada the admin is logged in
    When she fetches user 999
    Then she should receive a 404 response

  @users_07
  Scenario: Users can rename themselves
    Given Vera the viewer is logged in
    When she renames user 3 to "Vera Stagecraft"
    Then she should receive a 200 response
    And the response field "name" should be "Vera Stagecraft"

  @users_08
  Scenario: Only admins can change roles
    Given Vera the viewer is logged in
    When she changes the role of user 3 to "admin"
    Then she should receive a 403 response
    And the error should say "Only admins can change roles"

  @users_09
  Scenario: The admin promotes a viewer to clerk
    Given Ada the admin is logged in
    When she changes the role of user 3 to "warehouse_clerk"
    Then she should receive a 200 response
    And the response field "role" should be "warehouse_clerk"

  @users_10
  Scenario: The admin deletes a user
    Given Ada the admin is logged in
    When she deletes user 3
    Then she should receive a 204 response
    When she fetches user 3
    Then she should receive a 404 response

  @users_11
  Scenario: The admin cannot delete themselves
    Given Ada the admin is logged in
    When she deletes user 1
    Then she should receive a 409 response
    And the error should say "cannot delete yourself"
