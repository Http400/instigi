Feature: Workout Logging
  As a logged-in user
  I want to log my workout sessions with exercises, sets, reps, and weights
  So that I have an accurate record of my training

  Background:
    Given I am logged in as "user@example.com"
    And predefined exercises exist in the system

  Scenario: [US-004] - Start a workout session
    Given I am on the dashboard
    When I tap "Start Workout"
    Then a new active workout session is created
    And the session name defaults to today's date
    And I am taken to the active workout screen

  Scenario: [US-004] - Name a workout session
    Given I have started a workout session
    When I change the session name to "Leg Day"
    Then the session is saved with the name "Leg Day"

  Scenario: [US-005] - Add an exercise to a workout
    Given I have an active workout session
    When I search for "Bench Press" and select it
    Then "Bench Press" is added to my current workout

  Scenario: [US-005] - Add multiple exercises
    Given I have an active workout session
    When I add "Bench Press" and then add "Squat"
    Then both exercises appear in my workout in the order added

  Scenario: [US-006] - Log a set with reps and weight
    Given I have added "Bench Press" to my workout
    When I add a set with 8 reps and 80 kg
    Then the set appears under "Bench Press" with 8 reps and 80 kg

  Scenario: [US-006] - Log a bodyweight set (no weight)
    Given I have added "Pull-up" to my workout
    When I add a set with 10 reps and no weight
    Then the set is saved with 10 reps and null weight

  Scenario: [US-006] - Edit a logged set
    Given I have logged a set with 8 reps and 80 kg
    When I tap the set and change the weight to 85 kg
    Then the set is updated to 85 kg

  Scenario: [US-006] - Delete a logged set
    Given I have logged a set
    When I delete the set
    Then it is removed from the workout

  Scenario: [US-007] - Complete a workout session
    Given I have an active workout with at least one set logged
    When I tap "Finish Workout"
    Then the session is saved with a completedAt timestamp
    And the workout appears in my history

  Scenario: [US-007] - Attempt to finish an empty workout
    Given I have an active workout with no exercises added
    When I tap "Finish Workout"
    Then I see a warning asking me to confirm or continue logging

  Scenario: [US-007] - Discard a workout session
    Given I have an active workout session
    When I choose to discard the session
    Then the session is deleted and does not appear in history
