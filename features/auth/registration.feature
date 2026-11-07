@auth
Feature: Self-service registration
  As a new member of the props department
  I want to register an account
  So that I can browse the inventory

  @auth_20
  Scenario: Registering creates a viewer account
    When Nina registers a new account
    Then she should receive a 201 response
    And the "Location" header should match "^/users/\d+$"
    And the response field "role" should be "viewer"

  @auth_21
  Scenario: A registered user can log in straight away
    Given Nina has registered a new account
    When she logs in with the account she registered
    Then she should receive a 200 response

  @auth_22
  Scenario: Registering an email that already exists is rejected
    When Nina registers the email "admin@proproom.test"
    Then she should receive a 409 response
    And the error should say "already registered"

  @auth_23
  Scenario: Registering with an invalid payload is rejected
    When Nina registers with the email "not-an-email" and password "x"
    Then she should receive a 422 response
    And the response should report a validation error for "email"
