@products
Feature: Product descriptions, photos and bulk import
  As the props administrator
  I want to manage rich product content and import products in bulk
  So that the catalogue is complete without typing every prop by hand

  @products_27
  Scenario: Reading a plain-text description
    When Gus reads the description of product 1
    Then he should receive a 200 response
    And the "Content-Type" header should contain "text/plain"

  @products_28
  Scenario: The admin rewrites a description as plain text
    Given Ada the admin is logged in
    When she writes the description of product 1 as "A sturdy oak chair for period dramas."
    Then she should receive a 200 response
    When she reads the description of product 1
    Then the response field "" should be "A sturdy oak chair for period dramas."

  @products_29
  Scenario: A description must be sent as plain text
    Given Ada the admin is logged in
    When she writes the description of product 1 as JSON
    Then she should receive a 415 response

  @products_30
  Scenario: Downloading a product photo
    When Gus downloads the photo of product 1
    Then he should receive a 200 response
    And the "Content-Type" header should be "image/png"

  @products_31
  Scenario: Downloading a product photo as an attachment
    When Gus downloads the photo of product 1 as an attachment
    Then he should receive a 200 response
    And the "Content-Disposition" header should contain "attachment"

  @products_32
  Scenario: A product without a photo has nothing to download
    When Gus downloads the photo of product 2
    Then he should receive a 404 response

  @products_33
  Scenario: The clerk uploads a product photo
    Given Carl the clerk is logged in
    When he uploads a PNG photo for product 2
    Then he should receive a 201 response
    And the response field "content_type" should be "image/png"
    When he fetches product 2
    Then the response field "has_photo" should be true

  @products_34
  Scenario: Only images can be uploaded as photos
    Given Carl the clerk is logged in
    When he uploads a text file as the photo of product 2
    Then he should receive a 415 response

  @products_35
  Scenario: Photos larger than the upload limit are rejected
    Given Carl the clerk is logged in
    When he uploads a 3 MB photo for product 2
    Then he should receive a 413 response

  @products_36
  Scenario: Viewers cannot upload photos
    Given Vera the viewer is logged in
    When she uploads a PNG photo for product 2
    Then she should receive a 403 response

  @products_37
  Scenario: The admin removes a product photo
    Given Ada the admin is logged in
    When she removes the photo of product 1
    Then she should receive a 204 response
    When she downloads the photo of product 1
    Then she should receive a 404 response

  @products_38
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

  @products_39
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

  @products_40
  Scenario: A CSV without the required columns is a bad request
    Given Ada the admin is logged in
    When she imports a CSV file with the header "name,unit_price"
    Then she should receive a 400 response

  @products_41
  Scenario: Only CSV files can be imported
    Given Ada the admin is logged in
    When she imports a JSON file as products
    Then she should receive a 415 response
