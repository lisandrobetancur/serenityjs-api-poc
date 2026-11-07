@auth
Feature: Other authentication schemes
  As an integrator
  I want to authenticate with the scheme that suits my client
  So that scripts, legacy tools and browsers can all use the API

  @auth_11
  Scenario: Logging in with the OAuth2 password form
    When Carl logs in using the OAuth2 password form
    Then he should receive a 200 response
    And the response field "access_token" should be present

  @auth_12
  Scenario: Identifying with HTTP Basic credentials
    When Vera identifies with HTTP Basic credentials
    Then she should receive a 200 response
    And the response field "email" should be "viewer@proproom.test"

  @auth_13
  Scenario: Wrong HTTP Basic credentials are rejected
    When Gus identifies with HTTP Basic credentials "admin@proproom.test" and "wrong"
    Then he should receive a 401 response
    And the "WWW-Authenticate" header should contain "Basic"

  @auth_14
  Scenario: Identifying with a valid API key
    When Gus identifies with the API key "test-api-key-123"
    Then he should receive a 200 response
    And the response field "auth_method" should be "api_key"

  @auth_15
  Scenario Outline: Missing or invalid API keys are rejected
    When Gus identifies with the API key "<key>"
    Then he should receive a 401 response

    Examples:
      | key           |
      |               |
      | wrong-api-key |

  @auth_16
  Scenario: A cookie session identifies the user
    Given Ada has started a cookie session
    When she checks her cookie session
    Then she should receive a 200 response
    And the response field "email" should be "admin@proproom.test"

  @auth_17
  Scenario: The session cookie is HttpOnly
    When Ada starts a cookie session
    Then she should receive a 200 response
    And the "Set-Cookie" header should contain "HttpOnly"

  @auth_18
  Scenario: Checking a session without the cookie is rejected
    When Gus checks his cookie session without a cookie
    Then he should receive a 401 response

  @auth_19
  Scenario: Ending the cookie session
    Given Ada has started a cookie session
    When she ends her cookie session
    Then she should receive a 204 response
