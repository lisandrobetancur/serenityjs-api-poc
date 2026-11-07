@inventory
Feature: Stock levels and counts
  As a warehouse clerk
  I want to see and correct stock levels safely
  So that the books match what is on the shelves

  @smoke @inventory_01
  Scenario: Checking the stock level of a product in a warehouse
    Given Vera the viewer is logged in
    When she checks the stock of product 1 in warehouse 1
    Then she should receive a 200 response
    And the response should contain:
      | sku      | FUR-CHAIR-001 |
      | quantity | 40            |
      | version  | 1             |
    And the "ETag" header should be "\"stock-1-1-v1\""

  @inventory_02
  Scenario: A product never stored in a warehouse has a zero level
    Given Vera the viewer is logged in
    When she checks the stock of product 1 in warehouse 3
    Then she should receive a 200 response
    And the response should contain:
      | quantity | 0 |
      | version  | 0 |

  @inventory_03
  Scenario: Listing only the low stock in a warehouse
    Given Vera the viewer is logged in
    When she checks the low stock in warehouse 2
    Then she should receive a 200 response
    And every entry in "items" should have "warehouse_id" equal to 2

  @inventory_04
  Scenario: Sorting the stock of a warehouse by quantity
    Given Vera the viewer is logged in
    When she checks the stock in warehouse 1 sorted by "-quantity"
    Then she should receive a 200 response
    And the entries in "items" should be sorted by "quantity" in descending order

  @inventory_05
  Scenario: The clerk records a stock count with a fresh ETag
    Given Carl the clerk is logged in
    And he has checked the stock of product 1 in warehouse 1 and remembered its ETag
    When he records a count of 38 for product 1 in warehouse 1 because "Two chairs broken in rehearsal"
    Then he should receive a 200 response
    And the response should contain:
      | quantity | 38 |
      | version  | 2  |
    And the "ETag" header should be "\"stock-1-1-v2\""

  @inventory_06
  Scenario: A stock count records an adjustment movement
    Given Carl the clerk is logged in
    And he has checked the stock of product 1 in warehouse 1 and remembered its ETag
    And he has recorded a count of 38 for product 1 in warehouse 1 because "Annual stocktake"
    When he lists the "adjustment" movements of product 1
    Then he should receive a 200 response
    And the response field "total" should be 1

  @inventory_07
  Scenario: A stock count without If-Match is refused
    Given Carl the clerk is logged in
    When he records a count of 38 for product 1 in warehouse 1 without an ETag
    Then he should receive a 428 response
    And the error should say "If-Match header is required"

  @inventory_08
  Scenario: A stock count with a stale ETag is refused
    Given Carl the clerk is logged in
    And he has checked the stock of product 1 in warehouse 1 and remembered its ETag
    And he has recorded a "in" movement of 5 units of product 1 into warehouse 1
    When he records a count of 38 for product 1 in warehouse 1 because "Late count"
    Then he should receive a 412 response

  @inventory_09
  Scenario: Viewers cannot record stock counts
    Given Vera the viewer is logged in
    And she has checked the stock of product 1 in warehouse 1 and remembered its ETag
    When she records a count of 38 for product 1 in warehouse 1 because "Not allowed"
    Then she should receive a 403 response

  @inventory_10
  Scenario: The ledger shows a running balance across warehouses
    Given Vera the viewer is logged in
    When she reads the ledger of product 1
    Then she should receive a 200 response
    And the response should contain:
      | balance           | 52 |
      | entries.0.balance | 40 |
      | entries.1.balance | 52 |

  @inventory_11
  Scenario: The ledger can be scoped to one warehouse
    Given Vera the viewer is logged in
    When she reads the ledger of product 1 in warehouse 2
    Then she should receive a 200 response
    And the response should contain:
      | warehouse_id | 2  |
      | balance      | 12 |

  @smoke @inventory_12
  Scenario: Low-stock alerts list products at or below their reorder level
    Given Vera the viewer is logged in
    When she checks the low-stock alerts
    Then she should receive a 200 response
    And the "sku" of the entries in "" should be "LGT-SPOT-002,CON-TAPE-001"
    And the "shortage" of the entries in "" should be "0,5"

  @inventory_13
  Scenario: Low-stock alerts can be scoped to one warehouse
    Given Vera the viewer is logged in
    When she checks the low-stock alerts for warehouse 2
    Then she should receive a 200 response
    And the response should list 6 entries
    And every entry in "" should have "warehouse_id" equal to 2

  @inventory_14
  Scenario: A new receipt clears a low-stock alert
    Given Carl the clerk is logged in
    And he has recorded a "in" movement of 10 units of product 8 into warehouse 1
    When he checks the low-stock alerts
    Then the "sku" of the entries in "" should be "LGT-SPOT-002"
