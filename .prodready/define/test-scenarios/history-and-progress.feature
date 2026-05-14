Feature: Workout History and Progress
  As a logged-in user
  I want to view my past workouts and progress stats
  So that I can track consistency and see what weights I've used over time

  Background:
    Given I am logged in as "user@example.com"

  Scenario: [US-010] - View workout history list
    Given I have completed 3 workout sessions
    When I navigate to the History screen
    Then I see 3 workouts listed in reverse chronological order
    And each entry shows the date, name, and number of exercises

  Scenario: [US-010] - Empty history state
    Given I have no completed workouts
    When I navigate to the History screen
    Then I see an empty state prompting me to start my first workout

  Scenario: [US-011] - View a workout's details
    Given I have a completed workout "Leg Day" with "Squat" (3 sets: 60 kg x 5, 80 kg x 5, 100 kg x 3)
    When I tap on "Leg Day" in my history
    Then I see all exercises and their sets with reps and weights
    And I can see the total workout duration

  Scenario: [US-012] - Dashboard shows total workouts
    Given I have completed 10 workout sessions
    When I open the dashboard
    Then I see "Total workouts: 10"

  Scenario: [US-012] - Dashboard shows workouts this week
    Given I have completed 3 workouts this week
    When I open the dashboard
    Then I see "This week: 3 workouts"

  Scenario: [US-012] - Dashboard shows last weight per exercise
    Given I last logged "Bench Press" with 85 kg
    When I open the dashboard
    Then I see "Bench Press — last: 85 kg"

  Scenario: [US-012] - Dashboard empty state
    Given I have no completed workouts
    When I open the dashboard
    Then I see empty state placeholders with a prompt to start my first workout
