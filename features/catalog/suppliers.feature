@catalog
Feature: Suppliers
  As a buyer for the props department
  I want to maintain the list of suppliers
  So that purchase orders go to the right companies

  @smoke
  Scenario: Anyone can list the suppliers, two per page by default
    When Gus the guest lists the suppliers
    Then he should receive a 200 response
    And the response field "limit" should be 2
    And the "name" of the entries in "items" should be "Acme Stage Supply,Northwind Textiles"

  Scenario: Paginating suppliers with a cursor
    When Gus lists the suppliers 2 at a time
    Then he should receive a 200 response
    And the response field "items" should list 2 entries
    And the response field "next_cursor" should be present
    And the "Link" header should contain "rel=\"next\""
    When he lists the next page of suppliers 2 at a time
    Then he should receive a 200 response
    And the "name" of the entries in "items" should be "Lumen Lighting Co."
    And the response field "next_cursor" should be null

  Scenario: An invalid cursor is a bad request
    When Gus lists the suppliers from the cursor "not-a-cursor"
    Then he should receive a 400 response
    And the error should say "Invalid cursor"

  Scenario: Filtering suppliers by country
    When Gus lists the suppliers from "UK"
    Then he should receive a 200 response
    And the "name" of the entries in "items" should be "Northwind Textiles"

  Scenario: Creating a supplier with the API key
    When Gus creates the supplier "Gilded Frames Ltd" with a valid API key
    Then he should receive a 201 response
    And the response should include the "Location" header
    And the response field "name" should be "Gilded Frames Ltd"

  Scenario Outline: Supplier writes require a valid API key
    When Gus creates the supplier "Gilded Frames Ltd" with <key>
    Then he should receive a 401 response
    And the "WWW-Authenticate" header should be "ApiKey"

    Examples:
      | key                      |
      | no API key               |
      | the API key "wrong-key"  |

  Scenario: Replacing a supplier
    When Gus replaces supplier 2 with the name "Northwind Fabrics" from "Ireland"
    Then he should receive a 200 response
    And the response should contain:
      | name    | Northwind Fabrics |
      | country | Ireland           |

  Scenario: Partially updating a supplier
    When Gus changes the phone of supplier 3 to "+49-30-5550-0199"
    Then he should receive a 200 response
    And the response field "phone" should be "+49-30-5550-0199"
    And the response field "name" should be "Lumen Lighting Co."

  Scenario: A supplier referenced by products cannot be deleted
    When Gus deletes supplier 1
    Then he should receive a 409 response
    And the error should say "is referenced by products or purchase orders"

  Scenario: Deleting an unused supplier
    Given Gus has created the supplier "Short-lived Supply" with a valid API key
    When he deletes the supplier he created
    Then he should receive a 204 response
