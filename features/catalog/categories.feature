@catalog
Feature: Categories
  As the props administrator
  I want to organise products into categories
  So that props are easy to find

  @smoke @catalog_01
  Scenario: Anyone can list the categories
    When Gus the guest lists the categories
    Then he should receive a 200 response
    And the response should list 5 entries
    And the "name" of the entries in "" should be "Furniture,Lighting,Textiles,Hand props,Consumables"

  @catalog_02
  Scenario: Reading a single category
    When Gus fetches category 2
    Then he should receive a 200 response
    And the response field "name" should be "Lighting"

  @catalog_03
  Scenario: Fetching a category that does not exist
    When Gus fetches category 999
    Then he should receive a 404 response

  @catalog_04
  Scenario: The admin creates a category
    Given Ada the admin is logged in
    When she creates the category "Masks" described as "Face masks and headpieces"
    Then she should receive a 201 response
    And the response should include the "Location" header
    And the response field "name" should be "Masks"

  @catalog_05
  Scenario: A duplicate category name is rejected
    Given Ada the admin is logged in
    When she creates the category "Furniture" described as "Again"
    Then she should receive a 409 response
    And the error should say "already exists"

  @catalog_06
  Scenario: Non-admins cannot create categories
    Given Carl the clerk is logged in
    When he creates the category "Masks" described as "Face masks"
    Then he should receive a 403 response

  @catalog_07
  Scenario: The admin renames a category
    Given Ada the admin is logged in
    When she renames category 5 to "Expendables"
    Then she should receive a 200 response
    And the response field "name" should be "Expendables"

  @catalog_08
  Scenario: A category that still has products cannot be deleted
    Given Ada the admin is logged in
    When she deletes category 1
    Then she should receive a 409 response
    And the error should say "still has products"

  @catalog_09
  Scenario: The admin deletes an empty category
    Given Ada the admin is logged in
    And she has created the category "Temporary" described as "To be removed"
    When she deletes the category she created
    Then she should receive a 204 response
