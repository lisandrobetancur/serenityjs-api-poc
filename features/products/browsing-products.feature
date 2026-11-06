@products
Feature: Browsing products
  As anyone interested in the props inventory
  I want to search, filter, sort and page through the products
  So that I can quickly find the prop I need

  @smoke
  Scenario: Listing the products without credentials
    When Gus the guest lists the products
    Then he should receive a 200 response
    And the response field "total" should be 8
    And the "X-Total-Count" header should be "8"

  Scenario: Reading a product with its nested references
    When Gus fetches product 1
    Then he should receive a 200 response
    And the response should contain:
      | sku           | FUR-CHAIR-001     |
      | category.name | Furniture         |
      | supplier.name | Acme Stage Supply |
      | total_stock   | 52                |
      | unit_price    | 45.0              |
      | has_photo     | true              |
    And the "ETag" header should be "\"product-1-v1\""

  Scenario: Fetching a product that does not exist
    When Gus fetches product 999
    Then he should receive a 404 response

  Scenario Outline: Filtering products
    When Gus lists the products filtered by <filter> "<value>"
    Then he should receive a 200 response
    And the "sku" of the entries in "items" should be "<skus>"

    Examples:
      | filter      | value | skus                                     |
      | q           | lamp  | LGT-LAMP-001                             |
      | category_id | 2     | LGT-LAMP-001,LGT-SPOT-002                |
      | active      | false | HND-BOOK-002                             |
      | low_stock   | true  | LGT-SPOT-002,HND-BOOK-002,CON-TAPE-001   |

  Scenario: Filtering by a price range
    When Gus lists the products priced between 40 and 100
    Then he should receive a 200 response
    And the "sku" of the entries in "items" should be "FUR-CHAIR-001,TEX-CURT-001"

  Scenario: An inverted price range is a bad request
    When Gus lists the products priced between 100 and 40
    Then he should receive a 400 response
    And the error should say "min_price cannot be greater than max_price"

  Scenario Outline: Sorting products
    When Gus lists the products sorted by "<sort>"
    Then he should receive a 200 response
    And the entries in "items" should be sorted by "<field>" in <order> order

    Examples:
      | sort   | field      | order      |
      | sku    | sku        | ascending  |
      | -price | unit_price | descending |

  Scenario: Paginating products with offset links
    When Gus lists page 2 of the products with 2 per page
    Then he should receive a 200 response
    And the response field "items" should list 2 entries
    And the response should contain:
      | limit  | 2 |
      | offset | 2 |
    And the "Link" header should contain "rel=\"next\""
    And the "Link" header should contain "rel=\"prev\""
    And the "Link" header should contain "rel=\"last\""

  Scenario: Counting products with a HEAD request
    When Gus counts the products
    Then he should receive a 200 response
    And the "X-Total-Count" header should be "8"

  Scenario: A conditional GET with a fresh ETag returns 304
    Given Gus has fetched product 1 and remembered its ETag
    When he fetches product 1 again with the remembered ETag
    Then he should receive a 304 response

  Scenario: A conditional GET with a stale ETag returns the product
    When Gus fetches product 1 with the ETag "\"product-1-v0\""
    Then he should receive a 200 response

  Scenario: Checking the stock of a product across warehouses
    Given Vera the viewer is logged in
    When she checks the stock of product 1
    Then she should receive a 200 response
    And the "quantity" of the entries in "" should be "40,12,0"

  Scenario: The stock of a product is not public
    When Gus checks the stock of product 1
    Then he should receive a 401 response
