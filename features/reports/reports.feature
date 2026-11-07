@reports
Feature: Asynchronous reports
  As the head of props
  I want to request inventory reports that are generated in the background
  So that large exports do not block the API

  @smoke @reports_01
  Scenario: Requesting a report starts a background job
    Given Vera the viewer is logged in
    When she requests a "json" "inventory" report that takes 1 second
    Then she should receive a 202 response
    And the "Location" header should match "^/jobs/[0-9a-f]+$"
    And the "Retry-After" header should be "1"
    And the response field "status" should be "pending"

  @reports_02
  Scenario: A running job cannot be downloaded yet
    Given Vera the viewer is logged in
    And she has requested a "csv" "inventory" report that takes 3 seconds
    When she downloads the report
    Then she should receive a 409 response

  @slow @reports_03
  Scenario Outline: Downloading a completed report
    Given Vera the viewer is logged in
    And she has requested a "<format>" "<type>" report that takes 1 second
    When she waits for the report to complete
    And she downloads the report
    Then she should receive a 200 response
    And the "Content-Type" header should contain "<content_type>"
    And the "Content-Disposition" header should contain "attachment"

    Examples:
      | type      | format | content_type     |
      | inventory | csv    | text/csv         |
      | low_stock | json   | application/json |
      | movements | csv    | text/csv         |

  @slow @reports_04
  Scenario: A completed job links to its download
    Given Vera the viewer is logged in
    And she has requested a "json" "low_stock" report that takes 1 second
    When she waits for the report to complete
    And she checks the report job
    Then the response should contain:
      | status   | completed |
      | progress | 100       |
    And the response field "download_url" should contain "/download"

  @reports_05
  Scenario: An unknown report type is rejected
    Given Vera the viewer is logged in
    When she requests a "json" "payroll" report that takes 1 second
    Then she should receive a 422 response

  @reports_06
  Scenario: Reports need authentication
    When Gus the guest requests a "json" "inventory" report that takes 1 second
    Then he should receive a 401 response

  @reports_07
  Scenario: Checking a job that does not exist
    Given Vera the viewer is logged in
    When she checks the job "does-not-exist"
    Then she should receive a 404 response
