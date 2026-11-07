@platform
Feature: Service health and maintenance
  As an operator of the Prop Room API
  I want to check its health and take it offline for maintenance
  So that clients know when they can rely on it

  @smoke @platform_22
  Scenario: The health check reports the service is up
    When Gus checks the health of the API
    Then he should receive a 200 response
    And the response should contain:
      | status  | ok    |
      | version | 1.0.0 |

  @platform_23
  Scenario: The health check also answers HEAD requests
    When Gus checks the health of the API with a HEAD request
    Then he should receive a 200 response

  @platform_24
  Scenario: Maintenance mode makes the API unavailable
    Given Ada has switched maintenance mode on with a retry after 30 seconds
    When Gus fetches product 1
    Then he should receive a 503 response
    And the "Retry-After" header should be "30"

  @platform_25
  Scenario: The health check keeps answering during maintenance
    Given Ada has switched maintenance mode on with a retry after 30 seconds
    When Gus checks the health of the API
    Then he should receive a 200 response

  @platform_26
  Scenario: Switching maintenance mode off restores the service
    Given Ada has switched maintenance mode on with a retry after 30 seconds
    And she has switched maintenance mode off
    When Gus fetches product 1
    Then he should receive a 200 response

  @platform_27
  Scenario: Every response carries a request id
    When Gus checks the health of the API
    Then the response should include the "X-Request-ID" header

  @platform_28
  Scenario: A request id sent by the client is echoed back
    When Gus calls "/health" with the request id "trace-1234"
    Then the "X-Request-ID" header should be "trace-1234"
