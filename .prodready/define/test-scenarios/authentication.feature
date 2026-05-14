Feature: User Authentication
  As a fitness enthusiast
  I want to create and access my account
  So that my workout data is private and persistent

  Background:
    Given the app is running and the database is empty

  Scenario: [US-001] - Successful registration
    Given I am on the registration page
    When I submit email "user@example.com" and password "securepass123"
    Then my account is created
    And I am redirected to the dashboard
    And I am logged in

  Scenario: [US-001] - Registration with duplicate email
    Given a user with email "user@example.com" already exists
    When I try to register with the same email
    Then I see the error "Email already registered"
    And no new account is created

  Scenario: [US-001] - Registration with weak password
    Given I am on the registration page
    When I submit a password with fewer than 8 characters
    Then I see a validation error before the form is submitted

  Scenario: [US-002] - Successful login
    Given a registered user with email "user@example.com" and password "securepass123"
    When I submit the login form with correct credentials
    Then I am authenticated
    And I am redirected to the dashboard
    And a session token is stored client-side

  Scenario: [US-002] - Login with wrong credentials
    Given a registered user exists
    When I submit the login form with an incorrect password
    Then I see the error "Invalid email or password"
    And I remain on the login page

  Scenario: [US-003] - Logout
    Given I am logged in
    When I click the logout button
    Then my session token is invalidated
    And I am redirected to the login page
    And navigating to a protected page redirects me to login
