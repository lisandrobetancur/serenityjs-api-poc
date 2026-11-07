@products
Feature: Managing products
  As the props administrator
  I want to create, update and retire products
  So that the catalogue reflects what the theatre owns

  @smoke @products_14
  Scenario: The admin creates a product
    Given Ada the admin is logged in
    When she creates a product with:
      | sku                | NEW-CROWN-001 |
      | name               | Paper crown   |
      | category_id        | 4             |
      | supplier_id        | 1             |
      | unit_price         | 12.5          |
      | reorder_level      | 3             |
      | dimensions.width_cm  | 20          |
      | dimensions.height_cm | 12          |
      | dimensions.depth_cm  | 20          |
    Then she should receive a 201 response
    And the "Location" header should match "^/products/\d+$"
    And the "ETag" header should match "^\"product-\d+-v1\"$"
    And the response should contain:
      | sku                 | NEW-CROWN-001 |
      | category.name       | Hand props    |
      | total_stock         | 0             |
      | dimensions.width_cm | 20.0          |

  @products_15
  Scenario Outline: Only admins can create products
    Given <persona> is logged in
    When <persona> creates a product with:
      | sku         | NEW-CROWN-002 |
      | name        | Paper crown   |
      | category_id | 4             |
      | unit_price  | 12.5          |
    Then they should receive a 403 response
    And the error should say "Admin role required"

    Examples:
      | persona         |
      | Carl the clerk  |
      | Vera the viewer |

  @products_16
  Scenario: Anonymous callers cannot create products
    When Gus the guest creates a product with:
      | sku         | NEW-CROWN-003 |
      | name        | Paper crown   |
      | category_id | 4             |
      | unit_price  | 12.5          |
    Then he should receive a 401 response

  @products_17
  Scenario: A duplicate SKU is rejected
    Given Ada the admin is logged in
    When she creates a product with:
      | sku         | FUR-CHAIR-001 |
      | name        | Another chair |
      | category_id | 1             |
      | unit_price  | 10            |
    Then she should receive a 409 response

  @products_18
  Scenario Outline: Invalid products are rejected
    Given Ada the admin is logged in
    When she creates a product with:
      | sku         | <sku>        |
      | name        | <name>       |
      | category_id | 1            |
      | unit_price  | <unit_price> |
    Then she should receive a 422 response
    And the response should report a validation error for "<field>"

    Examples:
      | sku        | name  | unit_price | field      |
      | x          | Prop  | 10         | sku        |
      | NEW-OK-001 |       | 10         | name       |
      | NEW-OK-002 | Prop  | -1         | unit_price |

  @products_19
  Scenario: Referencing a category that does not exist is rejected
    Given Ada the admin is logged in
    When she creates a product with:
      | sku         | NEW-ORPHAN-001 |
      | name        | Orphan prop    |
      | category_id | 999            |
      | unit_price  | 10             |
    Then she should receive a 422 response

  @products_20
  Scenario: The admin replaces a product with a matching ETag
    Given Ada the admin is logged in
    And she has fetched product 2 and remembered its ETag
    When she replaces product 2 using the remembered ETag with:
      | sku         | FUR-TABLE-002       |
      | name        | Heavy folding table |
      | category_id | 1                   |
      | unit_price  | 135                 |
    Then she should receive a 200 response
    And the response field "name" should be "Heavy folding table"
    And the "ETag" header should be "\"product-2-v2\""

  @products_21
  Scenario: A replacement with a stale ETag is rejected
    Given Ada the admin is logged in
    When she replaces product 2 using the ETag "\"product-2-v0\"" with:
      | sku         | FUR-TABLE-002 |
      | name        | Stale table   |
      | category_id | 1             |
      | unit_price  | 1             |
    Then she should receive a 412 response

  @products_22
  Scenario: The admin partially updates a product
    Given Ada the admin is logged in
    When she changes the price of product 3 to 22.5
    Then she should receive a 200 response
    And the response field "unit_price" should be 22.5
    And the response field "sku" should be "LGT-LAMP-001"

  @products_23
  Scenario: Partial updates accept JSON merge patch
    Given Ada the admin is logged in
    When she changes the price of product 3 to 19.99 using a merge patch
    Then she should receive a 200 response
    And the response field "unit_price" should be 19.99

  @products_24
  Scenario: A partial update with a stale ETag is rejected
    Given Ada the admin is logged in
    When she changes the price of product 3 to 1 using the ETag "\"product-3-v0\""
    Then she should receive a 412 response
    And the error should say "If-Match does not match"

  @products_25
  Scenario: The admin deletes a product without history
    Given Ada the admin is logged in
    When she deletes product 7
    Then she should receive a 204 response
    When she fetches product 7
    Then she should receive a 404 response

  @products_26
  Scenario: A product with stock history cannot be deleted
    Given Ada the admin is logged in
    When she deletes product 1
    Then she should receive a 409 response
    And the error should say "has stock history"
