Feature: Retrieve posts
  As an API consumer
  I want to retrieve existing posts
  So that I can display them in my application

  Scenario: List all posts
    When Ana retrieves all posts
    Then she should receive a response with status 200
    And she should see at least one post

  Scenario: Retrieve a post by its id
    When Ana retrieves the post with id 1
    Then she should receive a response with status 200
    And she should see the post with id 1

  Scenario: Retrieve a post that does not exist
    When Ana retrieves the post with id 999999
    Then she should receive a response with status 404
