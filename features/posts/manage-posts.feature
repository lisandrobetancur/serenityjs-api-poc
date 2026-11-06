Feature: Manage posts
  As an author
  I want to create and delete posts
  So that I can keep my content up to date

  Scenario: Create a new post
    When Bruno creates a post with the following details:
      | userId | title              | body                                   |
      | 1      | Screenplay pattern | Actors, abilities, tasks and questions |
    Then he should receive a response with status 201
    And he should see the post titled "Screenplay pattern"

  Scenario: Delete an existing post
    When Bruno deletes the post with id 1
    Then he should receive a response with status 200
