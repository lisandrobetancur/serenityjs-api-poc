@framework @no_reset
Feature: Framework capabilities
  As a maintainer of this test suite
  I want the framework's cross-cutting behaviour covered by its own scenarios
  So that retries, polling, tenants, test data and skips keep working as the suite grows

  The retry scenarios call a local fake API (started per worker by the hooks), because the API under test
  cannot be asked to fail a given number of times and then recover.

  @acme_land @framework_01
  Scenario: The tenant tag adds the tenant header to every call
    When Tester echoes a request
    Then the response field "headers.x-tenant" should be "AC"

  @framework_02
  Scenario: The scenario account comes from test data
    Then Tester should have the test-data account "qa.user.02@example.test"

  @wip @framework_03
  Scenario: Unfinished scenarios are skipped and counted as work in progress
    When Tester echoes a request
    Then the response field "method" should be "POST"

  @fast_retries @framework_04
  Scenario: A bad gateway is retried until the API recovers
    When Tester fetches order "00000000-0000-0000-0000-000000000001" while the gateway fails 2 times with 502
    Then he should receive a 200 response
    And the run log should show 2 "Bad gateway (502)" retries for this scenario

  @fast_retries @framework_05
  Scenario: A gateway timeout is retried on GET
    When Tester fetches order "00000000-0000-0000-0000-000000000001" while the gateway fails 2 times with 504
    Then he should receive a 200 response

  @fast_retries @framework_06
  Scenario: A gateway timeout is not retried on POST, which may have reached the backend
    When Tester creates an order while the gateway fails 1 time with 504
    Then he should receive a 504 response

  @fast_retries @framework_07
  Scenario: An edge rejection is retried after a growing silence
    When Tester fetches order "00000000-0000-0000-0000-000000000001" while the gateway fails 2 times with 403edge
    Then he should receive a 200 response

  @fast_retries @framework_08
  Scenario: An application 403 is never retried
    When Tester fetches order "00000000-0000-0000-0000-000000000001" while the gateway fails 1 time with 403app
    Then he should receive a 403 response

  @framework_09
  Scenario: A poll reports only its final call, numbered
    When Tester waits until order "00000000-0000-0000-0000-000000000001" is "confirmed"
    Then the response field "status" should be "confirmed"

  @framework_10
  Scenario: External calls do not carry the tenant header
    When Tester fetches order "00000000-0000-0000-0000-000000000001" from the fake API
    Then he should receive a 200 response
    And the response field "tenant" should be null

  @framework_11
  Scenario: The response time of the last call is measured
    When Tester checks the health of the API
    Then the response should have arrived in under 2000 ms

  @framework_12
  Scenario: Logging in to the fake API with the wrong password returns the error envelope
    When Tester logs in to the fake API as "qa@example.test" with password "wrong"
    Then he should receive a 401 response
    And the response should contain:
      | error.code    | AUTH_INVALID_CREDENTIALS  |
      | error.message | Invalid email or password |
