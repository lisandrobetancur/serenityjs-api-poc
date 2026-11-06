@inventory
Feature: Stock movements
  As a warehouse clerk
  I want to record props coming in, going out and moving between warehouses
  So that every change in stock is traceable in an immutable ledger

  @smoke
  Scenario Outline: Recording movements updates the stock
    Given Carl the clerk is logged in
    When he records a "<type>" movement of <quantity> units of product 1 <direction>
    Then he should receive a 201 response
    And the "Location" header should match "^/movements/\d+$"
    And the response field "type" should be "<type>"
    When he checks the stock of product 1 in warehouse <warehouse>
    Then the response field "quantity" should be <expected>

    Examples:
      | type     | quantity | direction                          | warehouse | expected |
      | in       | 5        | into warehouse 1                   | 1         | 45       |
      | out      | 4        | out of warehouse 1                 | 1         | 36       |
      | transfer | 10       | from warehouse 1 to warehouse 2    | 2         | 22       |

  Scenario: Taking out more than is available is refused
    Given Carl the clerk is logged in
    When he records a "out" movement of 2 units of product 4 out of warehouse 2
    Then he should receive a 409 response
    And the error should say "Insufficient stock: 1 available in warehouse 2, 2 requested"

  Scenario: A transfer needs two different warehouses
    Given Carl the clerk is logged in
    When he records a "transfer" movement of 1 units of product 1 from warehouse 1 to warehouse 1
    Then he should receive a 422 response
    And the error should say "must be different"

  Scenario: A movement into a warehouse that does not exist is rejected
    Given Carl the clerk is logged in
    When he records a "in" movement of 1 units of product 1 into warehouse 999
    Then he should receive a 422 response

  Scenario: A movement with a non-positive quantity is rejected
    Given Carl the clerk is logged in
    When he records a "in" movement of 0 units of product 1 into warehouse 1
    Then he should receive a 422 response

  Scenario: Viewers cannot record movements
    Given Vera the viewer is logged in
    When she records a "in" movement of 1 units of product 1 into warehouse 1
    Then she should receive a 403 response
    And the error should say "Admin or warehouse_clerk role required"

  Scenario: Retrying a movement with the same Idempotency-Key does not duplicate it
    Given Carl the clerk is logged in
    And he has recorded a "in" movement of 5 units of product 1 into warehouse 1 with the idempotency key "delivery-42"
    When he records a "in" movement of 5 units of product 1 into warehouse 1 with the idempotency key "delivery-42"
    Then he should receive a 201 response
    And the "Idempotency-Replayed" header should be "true"
    When he checks the stock of product 1 in warehouse 1
    Then the response field "quantity" should be 45

  Scenario: Listing movements by type
    Given Vera the viewer is logged in
    When she lists the "in" movements
    Then she should receive a 200 response
    And the response field "total" should be 11
    And every entry in "items" should have "type" equal to "in"

  Scenario: Listing the newest movements first
    Given Vera the viewer is logged in
    When she lists the movements sorted by "-id"
    Then she should receive a 200 response
    And the entries in "items" should be sorted by "id" in descending order

  Scenario: Reading a single movement
    Given Vera the viewer is logged in
    When she fetches movement 1
    Then she should receive a 200 response
    And the response should contain:
      | type            | in      |
      | product_id      | 1       |
      | to_warehouse_id | 1       |
      | quantity        | 40      |
      | reference       | OPENING |

  Scenario Outline: Movements are immutable
    Given Ada the admin is logged in
    When she attempts to <action> movement 1
    Then she should receive a 405 response

    Examples:
      | action |
      | change |
      | delete |
