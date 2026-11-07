@database @no_reset
Feature: Database evidence
  As a maintainer of this test suite
  I want every database read and write to show up in the report
  So that a failing scenario explains itself without re-running queries by hand

  These scenarios use the fictitious example database (`<environment>_orders`).
  They are skipped when the database is not reachable, unless REQUIRE_SERVICES=true.

  @database_01
  Scenario: A read shows the statement, its parameters and the rows
    Then Tester should see order "ACME-0001" with status "pending" in the database

  @database_02
  Scenario: Masked columns are hidden in the result table
    Then Tester should see 2 users of tenant "AC" in the database

  @database_03
  Scenario: A write only updates the columns that changed
    When Tester expires order "ACME-0003" with id "00000000-0000-0000-0000-000000000003" in the database
    Then Tester should see order "ACME-0003" with status "expired" in the database
