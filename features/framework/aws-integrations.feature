@localstack @no_reset
Feature: AWS integrations
  As a maintainer of this test suite
  I want the AWS abilities exercised against LocalStack
  So that Dynamo, S3 and Lambda steps keep working without a real AWS account

  These scenarios need `docker compose up -d` (LocalStack) and ENVIRONMENT=local.
  They are skipped when LocalStack is not reachable, unless REQUIRE_SERVICES=true.

  @localstack_01
  Scenario: Saving and reading a config item in Dynamo
    Given Tester has saved the config flag "ACME_FEATURE_A" with the value "on"
    Then Tester should see the config flag "ACME_FEATURE_A" set to "on"

  @localstack_02
  Scenario: Expiring an item keeps its other attributes and writes a numeric ttl
    Given Tester has saved the config flag "ACME_FEATURE_B" with the value "on"
    When Tester expires the config flag "ACME_FEATURE_B"

  @localstack_03
  Scenario: Uploading a CSV built from a template
    When Tester uploads these orders as "imports/orders.csv" from the CSV template:
      | reference | customer_email          | quantity | unit_price |
      | ACME-0101 | qa.user.01@example.test | 2        | 15.5       |
      | ACME-0102 | qa.user.02@example.test | 1        | 9.99       |
    Then Tester deletes the file "imports/orders.csv"

  @localstack_04
  Scenario: Uploading an Excel file built from a template
    When Tester uploads these orders as "imports/orders.xlsx" from the Excel template:
      | reference | customer_email          | quantity | unit_price |
      | ACME-0201 | qa.user.01@example.test | 3        | 4.25       |
    Then Tester deletes the file "imports/orders.xlsx"

  @localstack_05
  Scenario: A Lambda that succeeds has no function error
    When Tester invokes the order confirmation Lambda

  @localstack_06
  Scenario: A Lambda that throws still answers 200, with a function error
    When Tester invokes the order confirmation Lambda asking it to fail

  @requires_mock_x @localstack_07
  Scenario: A config flag forced by a hook is restored afterwards
    Then Tester should see the config flag "MOCK_X" set to "true"
