package model

import "net/http"

type ErrorResponse struct {
	Code      int    `json:"code"`
	Error     string `json:"error"`
	Message   string `json:"message,omitempty"`
	Details   string `json:"details,omitempty"`
	RequestID string `json:"request_id,omitempty"`
}

type ErrorView struct {
	Status    int
	Title     string
	Message   string
	Details   string
	RequestID string
	ShowLogin bool
}

func HTTPStatusText(code int) string {
	if t := http.StatusText(code); t != "" {
		return t
	}
	return "Unknown Error"
}

func NewErrorResponse(code int, message, details, requestID string) ErrorResponse {
	return ErrorResponse{
		Code:      code,
		Error:     HTTPStatusText(code),
		Message:   message,
		Details:   details,
		RequestID: requestID,
	}
}

type AppError struct {
	Status  int
	Message string
	Details string
	Err     error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return e.Err.Error()
	}
	if e.Details != "" {
		return e.Details
	}
	return e.Message
}

func NewAppError(status int, message, details string) *AppError {
	return &AppError{Status: status, Message: message, Details: details}
}

func (e *AppError) WithErr(err error) *AppError {
	e.Err = err
	if e.Details == "" && err != nil {
		e.Details = err.Error()
	}
	return e
}
