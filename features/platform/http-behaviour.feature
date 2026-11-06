@platform
Feature: HTTP behaviour
  As an API client developer
  I want the API to follow HTTP semantics consistently
  So that generic HTTP tooling works with it out of the box

  Scenario Outline: The echo endpoint reflects any method
    When Gus sends a <method> request to the echo endpoint
    Then he should receive a 200 response
    And the response field "method" should be "<method>"

    Examples:
      | method |
      | GET    |
      | POST   |
      | PUT    |
      | PATCH  |
      | DELETE |

  Scenario: The echo endpoint reflects query parameters, headers and the JSON body
    When Gus echoes the JSON body {"prop": "skull", "act": 5} with the header "X-Scene" set to "graveyard" and the query "lang=en"
    Then he should receive a 200 response
    And the response should contain:
      | body.prop       | skull     |
      | body.act        | 5         |
      | headers.x-scene | graveyard |
      | query.lang      | en        |

  Scenario Outline: Redirects are answered with the right status and location
    When Gus sends <method> "<path>" without following redirects
    Then he should receive a <status> response
    And the "Location" header should be "<location>"

    Examples:
      | method | path                      | status | location             |
      | GET    | /v1/products/1            | 301    | /products/1          |
      | GET    | /catalog                  | 302    | /products?active=true |
      | POST   | /redirect/303?to=/echo    | 303    | /echo                |
      | POST   | /redirect/307?to=/echo    | 307    | /echo                |
      | PUT    | /redirect/308?to=/echo    | 308    | /echo                |

  Scenario: A 307 redirect keeps the method and body
    When Gus sends POST "/redirect/307?to=/echo" with the body {"cue": 12} following redirects
    Then he should receive a 200 response
    And the response should contain:
      | method   | POST |
      | body.cue | 12   |

  Scenario: A 303 redirect switches to GET
    When Gus sends POST "/redirect/303?to=/echo" with the body {"cue": 12} following redirects
    Then he should receive a 200 response
    And the response field "method" should be "GET"

  Scenario: OPTIONS lists the allowed methods
    When Gus asks which methods "/products" allows
    Then he should receive a 204 response
    And the "Allow" header should contain "GET"
    And the "Allow" header should contain "POST"

  Scenario: An unsupported method is refused
    When Gus sends PUT "/health"
    Then he should receive a 405 response

  Scenario: Malformed JSON is a bad request
    Given Ada the admin is logged in
    When she sends the raw body "{bad json" as "application/json" to POST "/categories"
    Then she should receive a 400 response
    And the error should say "not valid JSON"

  Scenario: A JSON endpoint refuses other content types
    Given Ada the admin is logged in
    When she sends the raw body "name=Masks" as "text/plain" to POST "/categories"
    Then she should receive a 415 response
    And the error should say "use application/json"

  Scenario Outline: The chaos endpoint answers with any status code
    When Gus asks the chaos endpoint for a <status>
    Then he should receive a <status> response

    Examples:
      | status |
      | 200    |
      | 418    |
      | 429    |
      | 502    |
      | 503    |

  Scenario: Throttling and unavailability responses suggest when to retry
    When Gus asks the chaos endpoint for a 503
    Then the response should include the "Retry-After" header

  Scenario: The chaos endpoint can add latency
    When Gus asks the chaos endpoint for a 200 after 300 ms
    Then he should receive a 200 response
    And the response field "delay_ms" should be 300

  Scenario: Unhandled exceptions return a generic 500
    When Gus triggers an unhandled exception
    Then he should receive a 500 response
    And the error should say "Internal server error"

  Scenario: The rate limit is announced in the response headers
    When Gus calls the rate-limited endpoint once as client "box-office"
    Then he should receive a 200 response
    And the "X-RateLimit-Limit" header should be "5"
    And the "X-RateLimit-Remaining" header should be "4"

  Scenario: Exceeding the rate limit is throttled
    When Gus calls the rate-limited endpoint 6 times as client "box-office"
    Then he should receive a 429 response
    And the response should include the "Retry-After" header
    And the "X-RateLimit-Remaining" header should be "0"

  Scenario: Rate limits are tracked per client
    Given Gus has called the rate-limited endpoint 6 times as client "box-office"
    When he calls the rate-limited endpoint once as client "stage-door"
    Then he should receive a 200 response

  Scenario: Preferences are stored in cookies
    When Gus saves the preferences language "es" and theme "dark"
    Then he should receive a 200 response
    And the "Set-Cookie" header should contain "language=es"
    And the "Set-Cookie" header should contain "theme=dark"

  Scenario: Preferences are read back from cookies
    When Gus reads his preferences with the cookies "language=pt; theme=dark"
    Then he should receive a 200 response
    And the response should contain:
      | language | pt   |
      | theme    | dark |

  Scenario: Unsupported preferences fall back to the defaults
    When Gus reads his preferences with the cookies "language=fr; theme=neon"
    Then he should receive a 200 response
    And the response should contain:
      | language | en    |
      | theme    | light |

  Scenario: Sending the contact form
    When Gus sends the contact form as "Ophelia" with the email "ophelia@elsinore.test" and the message "Need more flowers"
    Then he should receive a 201 response
    And the response should contain:
      | name    | Ophelia           |
      | message | Need more flowers |

  Scenario: The contact form validates its fields
    When Gus sends the contact form as "Ophelia" with the email "" and the message ""
    Then he should receive a 422 response
