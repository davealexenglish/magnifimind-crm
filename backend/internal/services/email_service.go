package services

import (
	"fmt"
	"log"
)

// EmailService handles email sending
type EmailService struct {
	devMode         bool
	region          string
	accessKeyID     string
	secretAccessKey string
	fromEmail       string
}

// NewEmailService creates a new email service
func NewEmailService(devMode bool, region, accessKeyID, secretAccessKey, fromEmail string) *EmailService {
	return &EmailService{
		devMode:         devMode,
		region:          region,
		accessKeyID:     accessKeyID,
		secretAccessKey: secretAccessKey,
		fromEmail:       fromEmail,
	}
}

// SendVerificationEmail sends an email verification link
func (s *EmailService) SendVerificationEmail(to, verificationToken string) error {
	if s.devMode {
		log.Printf("[DEV MODE] Would send verification email to %s with token: %s", to, verificationToken)
		return nil
	}

	// TODO: Implement AWS SES integration
	// For now, just log
	log.Printf("Sending verification email to %s", to)
	return nil
}

// SendPasswordResetEmail sends a password reset link
func (s *EmailService) SendPasswordResetEmail(to, resetToken string) error {
	if s.devMode {
		log.Printf("[DEV MODE] Would send password reset email to %s with token: %s", to, resetToken)
		return nil
	}

	// TODO: Implement AWS SES integration
	log.Printf("Sending password reset email to %s", to)
	return nil
}

// SendWelcomeEmail sends a welcome email to new users
func (s *EmailService) SendWelcomeEmail(to, name string) error {
	if s.devMode {
		log.Printf("[DEV MODE] Would send welcome email to %s (name: %s)", to, name)
		return nil
	}

	// TODO: Implement AWS SES integration
	subject := "Welcome to Manifimind CRM"
	body := fmt.Sprintf("Hello %s,\n\nWelcome to Manifimind CRM!\n\nBest regards,\nThe Manifimind Team", name)

	log.Printf("Sending welcome email to %s: %s - %s", to, subject, body)
	return nil
}
