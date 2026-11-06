@purchasing
Feature: Purchase orders
  As a warehouse clerk
  I want to order props from suppliers and receive them into stock
  So that the props department never runs out of what a production needs

  @smoke
  Scenario: Listing purchase orders by status
    Given Vera the viewer is logged in
    When she lists the "submitted" purchase orders
    Then she should receive a 200 response
    And the "code" of the entries in "items" should be "PO-00002"

  Scenario: Reading a purchase order
    Given Vera the viewer is logged in
    When she fetches purchase order 1
    Then she should receive a 200 response
    And the response should contain:
      | code   | PO-00001 |
      | status | draft    |
      | total  | 765.0    |

  @smoke
  Scenario: The clerk drafts a purchase order
    Given Carl the clerk is logged in
    When he drafts a purchase order from supplier 1 into warehouse 1 with:
      | product_id | quantity | unit_cost |
      | 1          | 10       | 30        |
      | 2          | 2        | 95.5      |
    Then he should receive a 201 response
    And the "Location" header should match "^/purchase-orders/\d+$"
    And the response should contain:
      | status              | draft         |
      | supplier.name       | Acme Stage Supply |
      | total               | 491.0         |
      | lines.0.sku         | FUR-CHAIR-001 |
      | lines.0.line_total  | 300.0         |

  Scenario: Viewers cannot draft purchase orders
    Given Vera the viewer is logged in
    When she drafts a purchase order from supplier 1 into warehouse 1 with:
      | product_id | quantity | unit_cost |
      | 1          | 1        | 10        |
    Then she should receive a 403 response

  Scenario: A purchase order needs at least one line
    Given Carl the clerk is logged in
    When he drafts a purchase order from supplier 1 into warehouse 1 with no lines
    Then he should receive a 422 response

  Scenario: Retrying a purchase order with the same Idempotency-Key replays the response
    Given Carl the clerk is logged in
    And he has drafted a purchase order from supplier 1 into warehouse 1 for 2 units of product 1 with the idempotency key "po-retry-1"
    When he drafts a purchase order from supplier 1 into warehouse 1 for 2 units of product 1 with the idempotency key "po-retry-1"
    Then he should receive a 201 response
    And the "Idempotency-Replayed" header should be "true"
    When he lists the "draft" purchase orders
    Then the response field "total" should be 2

  Scenario: Reusing an Idempotency-Key with a different body is rejected
    Given Carl the clerk is logged in
    And he has drafted a purchase order from supplier 1 into warehouse 1 for 2 units of product 1 with the idempotency key "po-retry-2"
    When he drafts a purchase order from supplier 2 into warehouse 1 for 2 units of product 1 with the idempotency key "po-retry-2"
    Then he should receive a 422 response
    And the error should say "Idempotency-Key was already used with a different request body"

  Scenario: Draft orders can be edited
    Given Carl the clerk is logged in
    When he adds the note "Deliver to the stage door" to purchase order 1
    Then he should receive a 200 response
    And the response field "notes" should be "Deliver to the stage door"

  Scenario: Submitted orders can no longer be edited
    Given Carl the clerk is logged in
    When he adds the note "Too late" to purchase order 2
    Then he should receive a 409 response

  Scenario: Draft orders can be deleted
    Given Carl the clerk is logged in
    When he deletes purchase order 1
    Then he should receive a 204 response

  Scenario Outline: Valid status transitions
    Given Carl the clerk is logged in
    When he <transition>s purchase order <order>
    Then he should receive a 200 response
    And the response field "status" should be "<status>"

    Examples:
      | transition | order | status    |
      | submit     | 1     | submitted |
      | cancel     | 1     | cancelled |
      | cancel     | 2     | cancelled |
      | receive    | 2     | received  |

  Scenario Outline: Invalid status transitions are refused
    Given Carl the clerk is logged in
    When he <transition>s purchase order <order>
    Then he should receive a 409 response

    Examples:
      | transition | order |
      | receive    | 1     |
      | submit     | 2     |
      | submit     | 3     |
      | cancel     | 3     |

  @smoke
  Scenario: Receiving an order adds its lines to stock
    Given Carl the clerk is logged in
    When he receives purchase order 2
    Then he should receive a 200 response
    When he checks the stock of product 4 in warehouse 1
    Then the response field "quantity" should be 7
    When he lists the "receipt" movements of product 4
    Then the response field "items.0.reference" should be "PO-00002"

  Scenario: The full purchasing lifecycle
    Given Carl the clerk is logged in
    And he has drafted a purchase order from supplier 3 into warehouse 2 for 6 units of product 4
    When he submits the purchase order he drafted
    And he receives the purchase order he drafted
    Then he should receive a 200 response
    When he checks the stock of product 4 in warehouse 2
    Then the response field "quantity" should be 7
