Feature: Exercise Management
  As a logged-in user
  I want to browse predefined exercises and add my own custom ones
  So that I can track any exercise I perform

  Background:
    Given I am logged in as "user@example.com"
    And the predefined exercise library contains exercises including "Bench Press", "Squat", "Deadlift"

  Scenario: [US-008] - Browse predefined exercises
    Given I open the exercise picker
    Then I see a searchable list of predefined exercises

  Scenario: [US-008] - Search exercises by name
    Given I open the exercise picker
    When I type "bench" in the search box
    Then only exercises with "bench" in the name are shown

  Scenario: [US-008] - Filter exercises by muscle group
    Given I open the exercise picker
    When I filter by muscle group "Chest"
    Then only chest exercises are shown in the list

  Scenario: [US-008] - Predefined exercises are read-only
    Given I view a predefined exercise
    Then I cannot edit or delete it

  Scenario: [US-009] - Create a custom exercise
    Given I am in the exercise picker
    When I tap "Create exercise" and enter the name "Cable Fly"
    Then "Cable Fly" is saved to my personal exercise library
    And it appears in search results alongside predefined exercises

  Scenario: [US-009] - Custom exercises are private
    Given I have created a custom exercise "Cable Fly"
    When another user searches for exercises
    Then they cannot see "Cable Fly"

  Scenario: [US-009] - Prevent duplicate custom exercise names
    Given I have a custom exercise named "Cable Fly"
    When I try to create another exercise also named "Cable Fly"
    Then I see a validation error: "Exercise name already exists"
