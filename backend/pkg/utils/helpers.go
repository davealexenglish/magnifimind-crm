package utils

import (
	"strconv"
)

// ParseInt parses a string to int
func ParseInt(s string) (int, error) {
	return strconv.Atoi(s)
}

// IntPtr returns a pointer to an int
func IntPtr(i int) *int {
	return &i
}

// StringPtr returns a pointer to a string
func StringPtr(s string) *string {
	return &s
}
