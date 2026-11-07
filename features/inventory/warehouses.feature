@inventory
Feature: Warehouses
  As the props administrator
  I want to manage the places where props are stored
  So that stock can be tracked per location

  @smoke @inventory_26
  Scenario: Listing the warehouses
    Given Vera the viewer is logged in
    When she lists the warehouses
    Then she should receive a 200 response
    And the response field "total" should be 3
    And the "code" of the entries in "items" should be "WH-MAIN,WH-STAGE,WH-ANNEX"

  @inventory_27
  Scenario: Warehouses are not public
    When Gus the guest lists the warehouses
    Then he should receive a 401 response

  @inventory_28
  Scenario: Fetching a warehouse that does not exist
    Given Vera the viewer is logged in
    When she fetches warehouse 999
    Then she should receive a 404 response

  @inventory_29
  Scenario: The admin opens a new warehouse
    Given Ada the admin is logged in
    When she creates the warehouse "WH-TOUR" called "Touring truck" in "Bristol"
    Then she should receive a 201 response
    And the response should contain:
      | code   | WH-TOUR |
      | active | true    |

  @inventory_30
  Scenario: A duplicate warehouse code is rejected
    Given Ada the admin is logged in
    When she creates the warehouse "WH-MAIN" called "Main again" in "London"
    Then she should receive a 409 response
    And the error should say "already exists"

  @inventory_31
  Scenario: Clerks cannot open warehouses
    Given Carl the clerk is logged in
    When he creates the warehouse "WH-TOUR" called "Touring truck" in "Bristol"
    Then he should receive a 403 response

  @inventory_32
  Scenario: The admin deactivates a warehouse
    Given Ada the admin is logged in
    When she deactivates warehouse 3
    Then she should receive a 200 response
    And the response field "active" should be false
    When she lists the active warehouses
    Then the response field "total" should be 2

  @inventory_33
  Scenario: Deleting an empty warehouse
    Given Ada the admin is logged in
    When she deletes warehouse 3
    Then she should receive a 204 response

  @inventory_34
  Scenario: A warehouse with stock history cannot be deleted
    Given Ada the admin is logged in
    When she deletes warehouse 1
    Then she should receive a 409 response
    And the error should say "has stock history"
