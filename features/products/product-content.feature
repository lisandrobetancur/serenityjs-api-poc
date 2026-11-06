@products
Feature: Product descriptions, photos and bulk import
  As the props administrator
  I want to manage rich product content and import products in bulk
  So that the catalogue is complete without typing every prop by hand

  Scenario: Reading a plain-text description
    When Gus reads the description of product 1
    Then he should receive a 200 response
    And the "Content-Type" header should contain "text/plain"

  Scenario: The admin rewrites a description as plain text
    Given Ada the admin is logged in
    When she writes the description of product 1 as "A sturdy oak chair for period dramas."
    Then she should receive a 200 response
    When she reads the description of product 1
    Then the response field "" should be "A sturdy oak chair for period dramas."

  Scenario: A description must be sent as plain text
    Given Ada the admin is logged in
    When she writes the description of product 1 as JSON
    Then she should receive a 415 response

  Scenario: Downloading a product photo
    When Gus downloads the photo of product 1
    Then he should receive a 200 response
    And the "Content-Type" header should be "image/png"

  Scenario: Downloading a product photo as an attachment
    When Gus downloads the photo of product 1 as an attachment
    Then he should receive a 200 response
    And the "Content-Disposition" header should contain "attachment"

  Scenario: A product without a photo has nothing to download
    When Gus downloads the photo of product 2
    Then he should receive a 404 response

  Scenario: The clerk uploads a product photo
    Given Carl the clerk is logged in
    When he uploads a PNG photo for product 2
    Then he should receive a 201 response
    And the response field "content_type" should be "image/png"
    When he fetches product 2
    Then the response field "has_photo" should be true

  Scenario: Only images can be uploaded as photos
    Given Carl the clerk is logged in
    When he uploads a text file as the photo of product 2
    Then he should receive a 415 response

  Scenario: Photos larger than the upload limit are rejected
    Given Carl the clerk is logged in
    When he uploads a 3 MB photo for product 2
    Then he should receive a 413 response

  Scenario: Viewers cannot upload photos
    Given Vera the viewer is logged in
    When she uploads a PNG photo for product 2
    Then she should receive a 403 response

  Scenario: The admin removes a product photo
    Given Ada the admin is logged in
    When she removes the photo of product 1
    Then she should receive a 204 response
    When she downloads the photo of product 1
    Then she should receive a 404 response

  Scenario: A dry-run import validates rows without creating products
    Given Ada the admin is logged in
    When she imports the following products as a dry run:
      | sku       | name           | category_id | unit_price |
      | IMP-A-001 | Imported crown | 4           | 5          |
      | IMP-A-002 |                | 4           | 5          |
    Then she should receive a 200 response
    And the response should contain:
      | dry_run       | true |
      | rows          | 2    |
      | created       | 1    |
      | created_ids   | []   |
      | errors.0.sku  | IMP-A-002 |

  Scenario: Importing products from a CSV file
    Given Ada the admin is logged in
    When she imports the following products:
      | sku       | name           | category_id | unit_price | tags         |
      | IMP-B-001 | Imported crown | 4           | 5          | royal\|paper |
      | IMP-B-002 | Imported cape  | 3           | 15         |              |
    Then she should receive a 200 response
    And the response field "created" should be 2
    When she lists the products filtered by q "IMP-B"
    Then the response field "total" should be 2

  Scenario: A CSV without the required columns is a bad request
    Given Ada the admin is logged in
    When she imports a CSV file with the header "name,unit_price"
    Then she should receive a 400 response

  Scenario: Only CSV files can be imported
    Given Ada the admin is logged in
    When she imports a JSON file as products
    Then she should receive a 415 response
